'use server';

import { query } from '@/server/db/pool';
import { getCurrentUser } from '@/server/auth/session';

export interface TrophyBadge {
  id: string;
  title: string;
  description: string;
  category: 'survivor' | 'predictor' | 'community';
  icon: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressText?: string;
}

export interface PlayerTournamentItem {
  leagueId: string;
  leagueName: string;
  leagueType: string;
  inviteCode: string;
  memberCount: number;
  role: string;
  lmsStatus?: string;
  lmsLives?: number;
  predictorPoints?: number;
}

export interface PlayerCareerStatsResult {
  success: boolean;
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    isGuest: boolean;
    memberSince: string;
  };
  metrics: {
    tournamentsEntered: number;
    tournamentsWon: number;
    lmsWeeksSurvived: number;
    totalPredictorPoints: number;
    correctExactScores: number;
    correctOutcomes: number;
    totalPicksMade: number;
  };
  badges: TrophyBadge[];
  tournaments: PlayerTournamentItem[];
  message?: string;
}

/**
 * Server Action: Retrieve all-time player statistics, trophy cabinet achievements,
 * and tournament participation history.
 */
export async function getPlayerCareerStats(
  userIdOverride?: string
): Promise<PlayerCareerStatsResult> {
  try {
    let userId = userIdOverride;
    if (!userId) {
      const sessionUser = await getCurrentUser();
      if (!sessionUser) {
        return {
          success: false,
          user: {
            id: '',
            displayName: 'Guest Player',
            email: '',
            avatarUrl: null,
            isGuest: true,
            memberSince: '',
          },
          metrics: {
            tournamentsEntered: 0,
            tournamentsWon: 0,
            lmsWeeksSurvived: 0,
            totalPredictorPoints: 0,
            correctExactScores: 0,
            correctOutcomes: 0,
            totalPicksMade: 0,
          },
          badges: [],
          tournaments: [],
          message: 'No active player session found',
        };
      }
      userId = sessionUser.id;
    }

    // 1. Fetch User Info
    const userRes = await query(
      `SELECT id, display_name, email, avatar_url, auth_id, created_at FROM users WHERE id::text = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return {
        success: false,
        user: {
          id: userId,
          displayName: 'Player',
          email: '',
          avatarUrl: null,
          isGuest: true,
          memberSince: '',
        },
        metrics: {
          tournamentsEntered: 0,
          tournamentsWon: 0,
          lmsWeeksSurvived: 0,
          totalPredictorPoints: 0,
          correctExactScores: 0,
          correctOutcomes: 0,
          totalPicksMade: 0,
        },
        badges: [],
        tournaments: [],
        message: 'Player profile not found',
      };
    }

    const dbUser = userRes.rows[0];
    const isGuest =
      !dbUser.auth_id ||
      dbUser.auth_id.startsWith('guest_') ||
      dbUser.email.includes('@groupbet.internal');

    // 2. Fetch Tournament Participation
    const tournamentSql = `
      SELECT 
        l.id AS league_id,
        l.name AS league_name,
        l.type AS league_type,
        l.invite_code,
        lm.role,
        (SELECT COUNT(*)::int FROM league_members WHERE league_id = l.id) AS member_count,
        e.status AS lms_status,
        e.lives_remaining AS lms_lives,
        plb.total_points AS predictor_points
      FROM league_members lm
      JOIN leagues l ON lm.league_id = l.id
      LEFT JOIN lms_entries e ON e.league_id = l.id AND e.user_id = lm.user_id
      LEFT JOIN predictor_leaderboard plb ON plb.league_id = l.id AND plb.user_id = lm.user_id
      WHERE lm.user_id::text = $1
      ORDER BY l.created_at DESC;
    `;
    const tourneyRes = await query(tournamentSql, [userId]);

    const tournaments: PlayerTournamentItem[] = tourneyRes.rows.map((r) => ({
      leagueId: r.league_id,
      leagueName: r.league_name,
      leagueType: r.league_type,
      inviteCode: r.invite_code,
      memberCount: r.member_count,
      role: r.role,
      lmsStatus: r.lms_status,
      lmsLives: r.lms_lives,
      predictorPoints: r.predictor_points,
    }));

    // 3. Tournaments Won
    const wonRes = await query(
      `SELECT COUNT(*)::int AS won_count FROM lms_entries WHERE user_id::text = $1 AND status = 'WINNER'`,
      [userId]
    );
    const tournamentsWon = wonRes.rows[0]?.won_count || 0;

    // 4. LMS Weeks Survived
    const survivedRes = await query(
      `
      SELECT COUNT(*)::int AS survived_count
      FROM lms_picks p
      JOIN lms_entries e ON p.entry_id = e.id
      WHERE e.user_id::text = $1 AND p.result = 'SURVIVED';
      `,
      [userId]
    );
    const lmsWeeksSurvived = survivedRes.rows[0]?.survived_count || 0;

    // 5. Predictor Points & Scoreline Stats
    const predictorRes = await query(
      `
      SELECT 
        COALESCE(SUM(total_points), 0)::int AS total_points,
        COALESCE(SUM(correct_exact_scores), 0)::int AS correct_exact_scores,
        COALESCE(SUM(correct_outcomes), 0)::int AS correct_outcomes
      FROM predictor_leaderboard
      WHERE user_id::text = $1;
      `,
      [userId]
    );
    const totalPredictorPoints = predictorRes.rows[0]?.total_points || 0;
    const correctExactScores = predictorRes.rows[0]?.correct_exact_scores || 0;
    const correctOutcomes = predictorRes.rows[0]?.correct_outcomes || 0;

    // 6. Total Picks Submitted
    const picksRes = await query(
      `
      SELECT 
        (SELECT COUNT(*)::int FROM lms_picks p JOIN lms_entries e ON p.entry_id = e.id WHERE e.user_id::text = $1) +
        (SELECT COUNT(DISTINCT fixture_id)::int FROM predictor_picks WHERE user_id::text = $1) AS total_picks;
      `,
      [userId]
    );
    const totalPicksMade = picksRes.rows[0]?.total_picks || 0;

    // 7. Hosted Leagues (for League Founder badge)
    const hostedRes = await query(
      `SELECT COUNT(*)::int AS hosted_count FROM leagues WHERE creator_id::text = $1`,
      [userId]
    );
    const isFounder = (hostedRes.rows[0]?.hosted_count || 0) > 0;

    // 8. Build Trophy Cabinet Badges
    const badges: TrophyBadge[] = [
      {
        id: 'tournament-champion',
        title: 'Tournament Champion',
        description: 'Outlast all rivals to win an LMS tournament pool',
        category: 'survivor',
        icon: '🏆',
        isUnlocked: tournamentsWon >= 1,
        progressText: tournamentsWon >= 1 ? 'Unlocked' : `${tournamentsWon}/1 Won`,
      },
      {
        id: 'iron-survivor',
        title: 'Iron Survivor',
        description: 'Successfully survive 3 or more gameweek rounds in LMS',
        category: 'survivor',
        icon: '🛡️',
        isUnlocked: lmsWeeksSurvived >= 3,
        progressText: lmsWeeksSurvived >= 3 ? 'Unlocked' : `${lmsWeeksSurvived}/3 Rounds`,
      },
      {
        id: 'dead-eye',
        title: 'Dead-Eye Predictor',
        description: 'Correctly predict the exact final scoreline of a match',
        category: 'predictor',
        icon: '🎯',
        isUnlocked: correctExactScores >= 1,
        progressText: correctExactScores >= 1 ? 'Unlocked' : `${correctExactScores}/1 Exact Score`,
      },
      {
        id: 'points-centurion',
        title: 'Points Centurion',
        description: 'Score 30 or more cumulative points in Match Predictor',
        category: 'predictor',
        icon: '👑',
        isUnlocked: totalPredictorPoints >= 30,
        progressText: totalPredictorPoints >= 30 ? 'Unlocked' : `${totalPredictorPoints}/30 Pts`,
      },
      {
        id: 'active-contender',
        title: 'Active Contender',
        description: 'Submit 5 or more total predictions or team selections',
        category: 'community',
        icon: '🔥',
        isUnlocked: totalPicksMade >= 5,
        progressText: totalPicksMade >= 5 ? 'Unlocked' : `${totalPicksMade}/5 Picks`,
      },
      {
        id: 'league-founder',
        title: 'League Founder',
        description: 'Create and host a private tournament group for friends',
        category: 'community',
        icon: '🤝',
        isUnlocked: isFounder,
        progressText: isFounder ? 'Unlocked' : 'Create 1 Tournament',
      },
    ];

    return {
      success: true,
      user: {
        id: dbUser.id,
        displayName: dbUser.display_name,
        email: dbUser.email,
        avatarUrl: dbUser.avatar_url,
        isGuest,
        memberSince: new Date(dbUser.created_at).toLocaleDateString(undefined, {
          month: 'short',
          year: 'numeric',
        }),
      },
      metrics: {
        tournamentsEntered: tournaments.length,
        tournamentsWon,
        lmsWeeksSurvived,
        totalPredictorPoints,
        correctExactScores,
        correctOutcomes,
        totalPicksMade,
      },
      badges,
      tournaments,
    };
  } catch (error: any) {
    console.error('[getPlayerCareerStats] Error:', error);
    return {
      success: false,
      user: {
        id: '',
        displayName: 'Player',
        email: '',
        avatarUrl: null,
        isGuest: true,
        memberSince: '',
      },
      metrics: {
        tournamentsEntered: 0,
        tournamentsWon: 0,
        lmsWeeksSurvived: 0,
        totalPredictorPoints: 0,
        correctExactScores: 0,
        correctOutcomes: 0,
        totalPicksMade: 0,
      },
      badges: [],
      tournaments: [],
      message: error?.message || 'Failed to retrieve career statistics',
    };
  }
}
