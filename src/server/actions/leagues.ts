'use server';

import { query, withTransaction } from '@/server/db/pool';
import { getCurrentUser, getOrCreateUser } from '@/server/auth/session';
import { League, LeagueType, LeagueMember, LmsEntry, User } from '@/core/types/database';

const CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // Avoid 0, O, 1, I, L

/**
 * Generate a random 6-character invite code formatted as GB-XXXXX
 */
async function generateUniqueInviteCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    let randomPart = '';
    for (let i = 0; i < 5; i++) {
      randomPart += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    const code = `GB-${randomPart}`;

    const check = await query('SELECT id FROM leagues WHERE invite_code = $1', [code]);
    if (check.rows.length === 0) {
      return code;
    }
  }
  return `GB-${Date.now().toString(36).toUpperCase()}`;
}

export interface CreateLeagueInput {
  name: string;
  type: LeagueType;
  creatorDisplayName: string;
  creatorEmail?: string;
  startingGameweek?: number;
  startingLives?: number;
  allowRepeatTeams?: boolean;
  matchesPerGameweek?: number | 'ALL';
  allowDuplicatePredictions?: boolean;
  exclusiveTeamPicks?: boolean;
}

export interface CreateLeagueResult {
  success: boolean;
  message?: string;
  league?: League;
  user?: User;
  inviteCode?: string;
  inviteUrl?: string;
  entryId?: string;
}

/**
 * Server Action: Create a new game pool (League), initialize creator membership and entry.
 */
export async function createLeague(input: CreateLeagueInput): Promise<CreateLeagueResult> {
  try {
    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length < 3) {
      return { success: false, message: 'Game name must be at least 3 characters long.' };
    }

    // 1. Resolve Creator
    const currentUser = await getCurrentUser();
    const user = currentUser || (await getOrCreateUser(input.creatorDisplayName, input.creatorEmail));

    // 2. Fetch active competition (Premier League)
    const compRes = await query(`SELECT id FROM competitions WHERE code = 'PL' LIMIT 1`);
    if (compRes.rows.length === 0) {
      return { success: false, message: 'Active competition (Premier League) not found in database.' };
    }
    const competitionId = compRes.rows[0].id;

    // 3. Generate Invite Code
    const inviteCode = await generateUniqueInviteCode();

    const isLms = input.type === 'LAST_MAN_STANDING' || input.type === 'ALL_IN_ONE';
    const isPredictor = input.type === 'PREDICTOR' || input.type === 'ALL_IN_ONE';

    const startingLives = isLms ? (input.startingLives ?? 1) : 0;
    const startingGameweek = input.startingGameweek ?? 5;

    const settings = {
      starting_lives: startingLives,
      starting_gameweek: startingGameweek,
      allow_repeat_teams: input.allowRepeatTeams ?? false,
      matches_per_gameweek: input.matchesPerGameweek ?? 1,
      allow_duplicate_predictions: input.allowDuplicatePredictions ?? false,
      exclusive_team_picks: input.exclusiveTeamPicks ?? true,
    };

    // 4. Create League and initial entry in transaction
    const result = await withTransaction(async (client) => {
      // Insert League
      const leagueRes = await client.query(
        `
        INSERT INTO leagues (competition_id, creator_id, name, type, invite_code, settings)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, competition_id, creator_id, name, type, invite_code, settings, created_at, updated_at
        `,
        [competitionId, user.id, trimmedName, input.type, inviteCode, JSON.stringify(settings)]
      );
      const league = leagueRes.rows[0] as League;

      // Add Creator as ADMIN member
      await client.query(
        `
        INSERT INTO league_members (league_id, user_id, role)
        VALUES ($1, $2, 'ADMIN')
        `,
        [league.id, user.id]
      );

      let entryId: string | undefined;

      // Initialize game mode entry
      if (isLms) {
        const entryRes = await client.query(
          `
          INSERT INTO lms_entries (league_id, user_id, lives_remaining, status)
          VALUES ($1, $2, $3, 'ALIVE')
          RETURNING id
          `,
          [league.id, user.id, startingLives]
        );
        entryId = entryRes.rows[0]?.id;
      }

      if (isPredictor) {
        await client.query(
          `
          INSERT INTO predictor_leaderboard (league_id, user_id, total_points)
          VALUES ($1, $2, 0)
          ON CONFLICT (league_id, user_id) DO NOTHING
          `,
          [league.id, user.id]
        );
      }

      return { league, entryId };
    });

    return {
      success: true,
      league: result.league,
      user,
      inviteCode,
      inviteUrl: `/join/${inviteCode}`,
      entryId: result.entryId,
    };
  } catch (error: any) {
    console.error('[createLeague] Error creating game:', error);
    return {
      success: false,
      message: error?.message || 'Failed to create game. Please try again.',
    };
  }
}

export interface LeaguePreview {
  id: string;
  name: string;
  type: LeagueType;
  invite_code: string;
  creator_name: string;
  creator_avatar: string | null;
  member_count: number;
  starting_gameweek: number;
  starting_lives: number;
  allow_repeat_teams: boolean;
  matches_per_gameweek?: number | 'ALL';
  allow_duplicate_predictions?: boolean;
  exclusive_team_picks?: boolean;
  created_at: string;
}

/**
 * Server Action: Look up a league by its shareable invite code for the preview screen.
 */
export async function getLeagueByInviteCode(
  inviteCode: string
): Promise<{ success: boolean; league?: LeaguePreview; message?: string }> {
  try {
    const cleanCode = inviteCode.trim().toUpperCase();

    const res = await query(
      `
      SELECT 
        l.id,
        l.name,
        l.type,
        l.invite_code,
        l.settings,
        l.created_at,
        u.display_name AS creator_name,
        u.avatar_url AS creator_avatar,
        (SELECT COUNT(*)::int FROM league_members WHERE league_id = l.id) AS member_count
      FROM leagues l
      JOIN users u ON l.creator_id = u.id
      WHERE UPPER(l.invite_code) = $1
      `,
      [cleanCode]
    );

    if (res.rows.length === 0) {
      return { success: false, message: 'Game not found. Please check the invite link or code.' };
    }

    const row = res.rows[0];
    const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings || {};

    const preview: LeaguePreview = {
      id: row.id,
      name: row.name,
      type: row.type,
      invite_code: row.invite_code,
      creator_name: row.creator_name,
      creator_avatar: row.creator_avatar,
      member_count: row.member_count,
      starting_gameweek: settings.starting_gameweek ?? 5,
      starting_lives: settings.starting_lives ?? 1,
      allow_repeat_teams: settings.allow_repeat_teams ?? false,
      matches_per_gameweek: settings.matches_per_gameweek ?? 1,
      allow_duplicate_predictions: settings.allow_duplicate_predictions ?? false,
      exclusive_team_picks: settings.exclusive_team_picks ?? true,
      created_at: row.created_at,
    };

    return { success: true, league: preview };
  } catch (error: any) {
    console.error('[getLeagueByInviteCode] Error:', error);
    return { success: false, message: 'Failed to look up game invite.' };
  }
}

export interface JoinLeagueInput {
  inviteCode: string;
  displayName: string;
  email?: string;
}

export interface JoinLeagueResult {
  success: boolean;
  message?: string;
  alreadyMember?: boolean;
  leagueId?: string;
  leagueName?: string;
  user?: User;
  entryId?: string;
}

/**
 * Server Action: Join an existing league via invite code.
 */
export async function joinLeague(input: JoinLeagueInput): Promise<JoinLeagueResult> {
  try {
    const cleanCode = input.inviteCode.trim().toUpperCase();
    const cleanName = input.displayName.trim();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, message: 'Please provide a display name with at least 2 characters.' };
    }

    // 1. Verify League Exists
    const leagueRes = await query(
      `SELECT id, name, type, settings FROM leagues WHERE UPPER(invite_code) = $1`,
      [cleanCode]
    );

    if (leagueRes.rows.length === 0) {
      return { success: false, message: 'Invalid invite code. Game not found.' };
    }

    const league = leagueRes.rows[0];
    const settings = typeof league.settings === 'string' ? JSON.parse(league.settings) : league.settings || {};

    // 2. Resolve or Create User
    const currentUser = await getCurrentUser();
    const user = currentUser || (await getOrCreateUser(cleanName, input.email));

    // 3. Enlist User into League & Entry in transaction
    const result = await withTransaction(async (client) => {
      // Check existing membership
      const memberRes = await client.query(
        `SELECT id FROM league_members WHERE league_id = $1 AND user_id = $2`,
        [league.id, user.id]
      );

      let isNewMember = false;
      if (memberRes.rows.length === 0) {
        await client.query(
          `INSERT INTO league_members (league_id, user_id, role) VALUES ($1, $2, 'MEMBER')`,
          [league.id, user.id]
        );
        isNewMember = true;
      }

      let entryId: string | undefined;
      const isLms = league.type === 'LAST_MAN_STANDING' || league.type === 'ALL_IN_ONE';
      const isPredictor = league.type === 'PREDICTOR' || league.type === 'ALL_IN_ONE';

      if (isLms) {
        const entryRes = await client.query(
          `SELECT id FROM lms_entries WHERE league_id = $1 AND user_id = $2`,
          [league.id, user.id]
        );

        if (entryRes.rows.length === 0) {
          const startingLives = settings.starting_lives ?? 1;
          const insertEntry = await client.query(
            `
            INSERT INTO lms_entries (league_id, user_id, lives_remaining, status)
            VALUES ($1, $2, $3, 'ALIVE')
            RETURNING id
            `,
            [league.id, user.id, startingLives]
          );
          entryId = insertEntry.rows[0]?.id;
        } else {
          entryId = entryRes.rows[0].id;
        }
      }

      if (isPredictor) {
        await client.query(
          `
          INSERT INTO predictor_leaderboard (league_id, user_id, total_points)
          VALUES ($1, $2, 0)
          ON CONFLICT (league_id, user_id) DO NOTHING
          `,
          [league.id, user.id]
        );
      }

      return { isNewMember, entryId };
    });

    return {
      success: true,
      alreadyMember: !result.isNewMember,
      leagueId: league.id,
      leagueName: league.name,
      user,
      entryId: result.entryId,
    };
  } catch (error: any) {
    console.error('[joinLeague] Error joining game:', error);
    return {
      success: false,
      message: error?.message || 'Failed to join game. Please try again.',
    };
  }
}

export interface UserLeagueSummary {
  id: string;
  name: string;
  type: LeagueType;
  invite_code: string;
  role: 'ADMIN' | 'MEMBER';
  creator_id?: string;
  current_round?: number;
  lives_remaining?: number;
  status?: string;
  points?: number;
  entryId?: string;
  matches_per_gameweek?: number | 'ALL';
  allow_duplicate_predictions?: boolean;
  exclusive_team_picks?: boolean;
  created_at: string;
}

/**
 * Server Action: Retrieve all leagues the current user is enrolled in.
 */
export async function getUserLeagues(userIdOverride?: string): Promise<UserLeagueSummary[]> {
  try {
    let userId = userIdOverride;
    if (!userId) {
      const currentUser = await getCurrentUser();
      if (!currentUser) return [];
      userId = currentUser.id;
    }

    const res = await query(
      `
      SELECT 
        l.id,
        l.creator_id,
        l.name,
        l.type,
        l.invite_code,
        l.current_round,
        l.settings,
        lm.role,
        l.created_at,
        e.id AS entry_id,
        e.lives_remaining,
        e.status AS lms_status,
        plb.total_points
      FROM leagues l
      JOIN league_members lm ON l.id = lm.league_id
      LEFT JOIN lms_entries e ON l.id = e.league_id AND e.user_id = $1
      LEFT JOIN predictor_leaderboard plb ON l.id = plb.league_id AND plb.user_id = $1
      WHERE lm.user_id = $1
      ORDER BY l.created_at DESC
      `,
      [userId]
    );

    return res.rows.map((row) => {
      const s = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings || {};
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        invite_code: row.invite_code,
        role: row.role,
        creator_id: row.creator_id,
        current_round: row.current_round ?? 1,
        lives_remaining: row.lives_remaining,
        status: row.lms_status,
        points: row.total_points,
        entryId: row.entry_id,
        matches_per_gameweek: s.matches_per_gameweek ?? 1,
        allow_duplicate_predictions: s.allow_duplicate_predictions ?? false,
        exclusive_team_picks: s.exclusive_team_picks ?? true,
        created_at: row.created_at,
      };
    });
  } catch (error) {
    console.error('[getUserLeagues] Error:', error);
    return [];
  }
}

export interface SurvivorBoardPlayer {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  livesRemaining: number;
  status: 'ALIVE' | 'ELIMINATED' | 'WINNER';
  currentPick?: {
    teamId: string;
    teamName: string;
    teamTla: string;
    crestUrl: string;
    result: string;
    isMasked?: boolean;
  } | null;
}

/**
 * Server Action: Retrieve survivor board / members for a specific league.
 * Implements pick privacy masking: opponent picks remain hidden until match kickoff.
 */
export async function getLeagueSurvivorBoard(
  leagueId: string,
  gameweekNumber?: number,
  viewingUserId?: string
): Promise<{ success: boolean; players: SurvivorBoardPlayer[]; leagueName?: string }> {
  try {
    let currentUserId = viewingUserId;
    if (!currentUserId) {
      try {
        const user = await getCurrentUser();
        if (user) currentUserId = user.id;
      } catch {
        // Fallback for tests or unauthenticated callers
      }
    }

    const leagueRes = await query(`SELECT name, type, settings FROM leagues WHERE id::text = $1`, [leagueId]);
    if (leagueRes.rows.length === 0) {
      return { success: false, players: [] };
    }

    const settings = typeof leagueRes.rows[0].settings === 'string'
      ? JSON.parse(leagueRes.rows[0].settings)
      : leagueRes.rows[0].settings || {};
    const isExclusive = settings.exclusive_team_picks ?? true;

    // Fetch all LMS entries joined with users, gameweek pick, team, and fixture kickoff
    const sql = `
      SELECT 
        u.id AS user_id,
        u.display_name,
        u.avatar_url,
        e.lives_remaining,
        e.status,
        p.result AS pick_result,
        t.id AS team_id,
        t.name AS team_name,
        t.tla AS team_tla,
        t.crest_url,
        f.kickoff_time,
        f.status AS fixture_status
      FROM lms_entries e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN gameweeks gw ON gw.gameweek_number = $2
      LEFT JOIN lms_picks p ON p.entry_id = e.id AND p.gameweek_id = gw.id
      LEFT JOIN teams t ON p.team_id = t.id
      LEFT JOIN fixtures f ON f.gameweek_id = gw.id AND (f.home_team_id = t.id OR f.away_team_id = t.id)
      WHERE e.league_id::text = $1
      ORDER BY 
        CASE 
          WHEN e.status = 'WINNER' THEN 1
          WHEN e.status = 'ALIVE' THEN 2
          ELSE 3
        END,
        e.lives_remaining DESC,
        u.display_name ASC
    `;

    const res = await query(sql, [leagueId, gameweekNumber ?? 5]);
    const now = Date.now();

    const players: SurvivorBoardPlayer[] = res.rows.map((row) => {
      let currentPick = null;

      if (row.team_id) {
        const isOwnPick = Boolean(currentUserId && row.user_id === currentUserId);
        const isKickoffPassed = row.kickoff_time
          ? new Date(row.kickoff_time).getTime() <= now
          : false;
        const isLiveOrFinished = ['LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED'].includes(row.fixture_status);
        // If league has exclusive team picks enabled, all players can see each other's live selections
        const isVisible = isOwnPick || isKickoffPassed || isLiveOrFinished || isExclusive;

        if (isVisible) {
          currentPick = {
            teamId: row.team_id,
            teamName: row.team_name,
            teamTla: row.team_tla,
            crestUrl: row.crest_url,
            result: row.pick_result,
            isMasked: false,
          };
        } else {
          // Anti-cheat privacy masking: opponent pick is locked until match kickoff
          currentPick = {
            teamId: '',
            teamName: 'Pick Locked',
            teamTla: 'LOCK',
            crestUrl: '',
            result: 'PENDING',
            isMasked: true,
          };
        }
      }

      return {
        userId: row.user_id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        livesRemaining: row.lives_remaining,
        status: row.status,
        currentPick,
      };
    });

    return {
      success: true,
      players,
      leagueName: leagueRes.rows[0].name,
    };
  } catch (error) {
    console.error('[getLeagueSurvivorBoard] Error:', error);
    return { success: false, players: [] };
  }
}

export interface LeagueTeamClaim {
  teamId: string;
  teamName: string;
  teamTla: string;
  crestUrl: string | null;
  claimedBy: string;
  userId: string;
  isOwn: boolean;
}

/**
 * Server Action: Retrieve all claimed LMS team picks for a gameweek in a league.
 * Used by WeeklyFixtures, FixtureCard, and LmsPickModal to grey out/lock claimed teams.
 */
export async function getLeagueGameweekLmsPicks(
  leagueId: string,
  gameweekNumber: number,
  currentUserId?: string
): Promise<{
  success: boolean;
  claims: Record<string, LeagueTeamClaim>;
  exclusiveTeamPicks: boolean;
}> {
  try {
    if (!leagueId || leagueId.startsWith('demo-')) {
      return { success: true, claims: {}, exclusiveTeamPicks: true };
    }

    const leagueRes = await query(`SELECT settings FROM leagues WHERE id::text = $1`, [leagueId]);
    const settings = leagueRes.rows.length > 0
      ? (typeof leagueRes.rows[0].settings === 'string' ? JSON.parse(leagueRes.rows[0].settings) : leagueRes.rows[0].settings || {})
      : {};

    const exclusiveTeamPicks = settings.exclusive_team_picks ?? true;

    const sql = `
      SELECT 
        t.id AS team_id,
        t.name AS team_name,
        t.tla AS team_tla,
        t.crest_url,
        t.external_id AS team_external_id,
        u.id AS user_id,
        u.display_name
      FROM lms_picks p
      JOIN lms_entries e ON p.entry_id = e.id
      JOIN users u ON e.user_id = u.id
      JOIN teams t ON p.team_id = t.id
      JOIN gameweeks gw ON p.gameweek_id = gw.id
      WHERE e.league_id::text = $1
        AND gw.gameweek_number = $2
        AND e.status != 'ELIMINATED';
    `;

    const res = await query(sql, [leagueId, gameweekNumber]);
    const claims: Record<string, LeagueTeamClaim> = {};

    for (const row of res.rows) {
      const claim: LeagueTeamClaim = {
        teamId: row.team_id,
        teamName: row.team_name,
        teamTla: row.team_tla,
        crestUrl: row.crest_url,
        claimedBy: row.display_name,
        userId: row.user_id,
        isOwn: Boolean(currentUserId && row.user_id === currentUserId),
      };
      claims[row.team_id] = claim;
      if (row.team_external_id) {
        claims[String(row.team_external_id)] = claim;
      }
    }

    return {
      success: true,
      claims,
      exclusiveTeamPicks,
    };
  } catch (error) {
    console.error('[getLeagueGameweekLmsPicks] Error:', error);
    return { success: false, claims: {}, exclusiveTeamPicks: true };
  }
}
