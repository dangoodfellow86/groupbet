'use server';

import { query, withTransaction } from '@/server/db/pool';
import { getCurrentUser } from '@/server/auth/session';
import { MarketType, MatchOutcome, PredictorLeaderboard, User } from '@/core/types/database';

export interface SubmitPredictorPicksInput {
  leagueId: string;
  userId?: string;
  fixtureId: string;
  exactScore?: {
    home: number;
    away: number;
  };
  outcome?: MatchOutcome;
  btts?: 'YES' | 'NO';
  overUnder?: 'OVER' | 'UNDER';
  kickoffTime?: string;
}

export interface SubmitPredictorPicksResult {
  success: boolean;
  message: string;
  fixtureId?: string;
}

/**
 * Server Action: Submit or update multi-market predictor picks for a fixture.
 */
export async function submitPredictorPicks(
  input: SubmitPredictorPicksInput
): Promise<SubmitPredictorPicksResult> {
  const { leagueId, fixtureId, exactScore, outcome, btts, overUnder, kickoffTime } = input;

  try {
    // 1. Resolve User
    let userId = input.userId;
    if (!userId) {
      const user = await getCurrentUser();
      userId = user?.id;
    }

    // Handle Demo Mode
    if (!userId || leagueId.startsWith('demo-')) {
      return {
        success: true,
        message: 'Predictions saved successfully! (Demo Mode)',
        fixtureId,
      };
    }

    return await withTransaction(async (client) => {
      // 2. Resolve Fixture & Verify Kickoff Deadline
      const fixRes = await client.query(
        `SELECT f.id, f.gameweek_id, f.kickoff_time, f.status,
                ht.name AS home_team_name, at.name AS away_team_name
         FROM fixtures f
         JOIN teams ht ON f.home_team_id = ht.id
         JOIN teams at ON f.away_team_id = at.id
         WHERE f.id::text = $1 OR f.external_id::text = $1 LIMIT 1`,
        [fixtureId]
      );

      if (fixRes.rows.length === 0) {
        throw new Error('Fixture not found in database.');
      }

      const fixture = fixRes.rows[0];
      const targetKickoff = kickoffTime || fixture.kickoff_time;

      if (targetKickoff && new Date(targetKickoff).getTime() <= Date.now()) {
        throw new Error('Predictions are locked. Kickoff has already passed.');
      }

      if (fixture.status === 'FINISHED' || fixture.status === 'LIVE') {
        throw new Error('Cannot predict on live or finished fixtures.');
      }

      const actualFixtureId = fixture.id;

      // 3. Resolve League Settings (Matches per gameweek & Duplicate match claim rules)
      const leagueRes = await client.query(`SELECT settings FROM leagues WHERE id::text = $1`, [leagueId]);
      const leagueSettings = leagueRes.rows.length > 0
        ? (typeof leagueRes.rows[0].settings === 'string' ? JSON.parse(leagueRes.rows[0].settings) : leagueRes.rows[0].settings || {})
        : {};

      const allowDuplicate = leagueSettings.allow_duplicate_predictions === true;
      const matchesLimit = leagueSettings.matches_per_gameweek ?? 1;

      // 4. Exclusive Match Claim Check (First-come, first-served)
      if (!allowDuplicate) {
        const claimedCheck = await client.query(
          `
          SELECT u.display_name
          FROM predictor_picks pp
          JOIN users u ON pp.user_id = u.id
          WHERE pp.league_id = $1
            AND pp.fixture_id = $2
            AND pp.user_id != $3
          LIMIT 1;
          `,
          [leagueId, actualFixtureId, userId]
        );

        if (claimedCheck.rows.length > 0) {
          const claimedBy = claimedCheck.rows[0].display_name;
          const matchLabel = fixture.home_team_name && fixture.away_team_name
            ? `${fixture.home_team_name} vs ${fixture.away_team_name}`
            : 'This match';
          throw new Error(
            `${matchLabel} has already been chosen by ${claimedBy} in this group. Under exclusive match rules, each fixture can only be predicted by one player per gameweek.`
          );
        }
      }

      // 5. Weekly Prediction Limit Check (Default: 1 match per gameweek)
      if (matchesLimit === 1) {
        // Automatically replace any previous match pick in this gameweek
        await client.query(
          `
          DELETE FROM predictor_picks pp
          USING fixtures f
          WHERE pp.fixture_id = f.id
            AND pp.league_id = $1
            AND pp.user_id = $2
            AND f.gameweek_id = $3
            AND pp.fixture_id != $4;
          `,
          [leagueId, userId, fixture.gameweek_id, actualFixtureId]
        );
      } else if (matchesLimit !== 'ALL' && typeof matchesLimit === 'number' && matchesLimit > 1) {
        const otherFixturesRes = await client.query(
          `
          SELECT COUNT(DISTINCT pp.fixture_id)::int AS count
          FROM predictor_picks pp
          JOIN fixtures f ON pp.fixture_id = f.id
          WHERE pp.league_id = $1
            AND pp.user_id = $2
            AND f.gameweek_id = $3
            AND pp.fixture_id != $4;
          `,
          [leagueId, userId, fixture.gameweek_id, actualFixtureId]
        );

        if (otherFixturesRes.rows[0].count >= matchesLimit) {
          throw new Error(`You have reached your prediction limit of ${matchesLimit} matches for this gameweek.`);
        }
      }

      // 6. Ensure User is a member of the League
      const memberCheck = await client.query(
        `SELECT id FROM league_members WHERE league_id = $1 AND user_id = $2`,
        [leagueId, userId]
      );

      if (memberCheck.rows.length === 0) {
        // Auto-enlist as MEMBER if entering predictions
        await client.query(
          `INSERT INTO league_members (league_id, user_id, role) VALUES ($1, $2, 'MEMBER') ON CONFLICT DO NOTHING`,
          [leagueId, userId]
        );
      }

      // 7. Ensure presence in predictor_leaderboard
      await client.query(
        `INSERT INTO predictor_leaderboard (league_id, user_id, total_points) VALUES ($1, $2, 0) ON CONFLICT (league_id, user_id) DO NOTHING`,
        [leagueId, userId]
      );

      // 8. Upsert Market 1: EXACT_SCORE
      if (exactScore) {
        await client.query(
          `
          INSERT INTO predictor_picks (
            league_id, user_id, fixture_id, market,
            predicted_home_score, predicted_away_score, updated_at
          ) VALUES ($1, $2, $3, 'EXACT_SCORE', $4, $5, NOW())
          ON CONFLICT (league_id, user_id, fixture_id, market) DO UPDATE SET
            predicted_home_score = EXCLUDED.predicted_home_score,
            predicted_away_score = EXCLUDED.predicted_away_score,
            updated_at = NOW();
          `,
          [leagueId, userId, actualFixtureId, exactScore.home, exactScore.away]
        );
      }

      // 6. Upsert Market 2: OUTCOME
      if (outcome) {
        await client.query(
          `
          INSERT INTO predictor_picks (
            league_id, user_id, fixture_id, market,
            predicted_outcome, updated_at
          ) VALUES ($1, $2, $3, 'OUTCOME', $4, NOW())
          ON CONFLICT (league_id, user_id, fixture_id, market) DO UPDATE SET
            predicted_outcome = EXCLUDED.predicted_outcome,
            updated_at = NOW();
          `,
          [leagueId, userId, actualFixtureId, outcome]
        );
      }

      // 7. Upsert Market 3: BTTS
      if (btts) {
        await client.query(
          `
          INSERT INTO predictor_picks (
            league_id, user_id, fixture_id, market,
            predicted_outcome, updated_at
          ) VALUES ($1, $2, $3, 'BTTS', $4, NOW())
          ON CONFLICT (league_id, user_id, fixture_id, market) DO UPDATE SET
            predicted_outcome = EXCLUDED.predicted_outcome,
            updated_at = NOW();
          `,
          [leagueId, userId, actualFixtureId, btts]
        );
      }

      // 8. Upsert Market 4: OVER_UNDER_2_5
      if (overUnder) {
        await client.query(
          `
          INSERT INTO predictor_picks (
            league_id, user_id, fixture_id, market,
            predicted_outcome, updated_at
          ) VALUES ($1, $2, $3, 'OVER_UNDER_2_5', $4, NOW())
          ON CONFLICT (league_id, user_id, fixture_id, market) DO UPDATE SET
            predicted_outcome = EXCLUDED.predicted_outcome,
            updated_at = NOW();
          `,
          [leagueId, userId, actualFixtureId, overUnder]
        );
      }

      return {
        success: true,
        message: 'Predictions confirmed successfully!',
        fixtureId: actualFixtureId,
      };
    });
  } catch (error: any) {
    console.error('[submitPredictorPicks] Error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to submit predictions. Please try again.',
    };
  }
}

export interface UserFixturePrediction {
  fixtureId: string;
  exactScore?: {
    home: number;
    away: number;
  };
  outcome?: MatchOutcome;
  btts?: 'YES' | 'NO';
  overUnder?: 'OVER' | 'UNDER';
  pointsAwarded: number;
  isSettled: boolean;
}

/**
 * Server Action: Retrieve user's submitted predictions for all fixtures in a gameweek.
 */
export async function getUserGameweekPredictions(
  leagueId: string,
  gameweekNumber: number,
  userIdOverride?: string
): Promise<{ success: boolean; predictions: Record<string, UserFixturePrediction> }> {
  try {
    let userId = userIdOverride;
    if (!userId) {
      const user = await getCurrentUser();
      if (!user) return { success: true, predictions: {} };
      userId = user.id;
    }

    const res = await query(
      `
      SELECT 
        p.fixture_id,
        f.external_id AS fixture_external_id,
        p.market,
        p.predicted_home_score,
        p.predicted_away_score,
        p.predicted_outcome,
        p.points_awarded,
        p.is_settled
      FROM predictor_picks p
      JOIN fixtures f ON p.fixture_id = f.id
      JOIN gameweeks gw ON f.gameweek_id = gw.id
      WHERE p.league_id::text = $1 
        AND p.user_id::text = $2
        AND gw.gameweek_number = $3
      `,
      [leagueId, userId, gameweekNumber]
    );

    const predictions: Record<string, UserFixturePrediction> = {};

    for (const row of res.rows) {
      const key = row.fixture_id;
      if (!predictions[key]) {
        predictions[key] = {
          fixtureId: row.fixture_id,
          pointsAwarded: 0,
          isSettled: false,
        };
      }

      predictions[key].pointsAwarded += row.points_awarded || 0;
      if (row.is_settled) {
        predictions[key].isSettled = true;
      }

      if (row.market === 'EXACT_SCORE') {
        predictions[key].exactScore = {
          home: row.predicted_home_score,
          away: row.predicted_away_score,
        };
      } else if (row.market === 'OUTCOME') {
        predictions[key].outcome = row.predicted_outcome as MatchOutcome;
      } else if (row.market === 'BTTS') {
        predictions[key].btts = row.predicted_outcome as 'YES' | 'NO';
      } else if (row.market === 'OVER_UNDER_2_5') {
        predictions[key].overUnder = row.predicted_outcome as 'OVER' | 'UNDER';
      }

      // Also map by external_id if available
      if (row.fixture_external_id) {
        predictions[String(row.fixture_external_id)] = predictions[key];
      }
    }

    return { success: true, predictions };
  } catch (error) {
    console.error('[getUserGameweekPredictions] Error:', error);
    return { success: false, predictions: {} };
  }
}

export interface PredictorLeaderboardRow {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  correctExactScores: number;
  correctOutcomes: number;
  rank: number;
}

/**
 * Server Action: Retrieve ranked group leaderboard for a Predictor league.
 */
export async function getLeaguePredictorLeaderboard(
  leagueId: string
): Promise<{ success: boolean; leaderboard: PredictorLeaderboardRow[]; leagueName?: string }> {
  try {
    const leagueRes = await query(`SELECT name FROM leagues WHERE id::text = $1`, [leagueId]);
    if (leagueRes.rows.length === 0) {
      return { success: false, leaderboard: [] };
    }

    const res = await query(
      `
      SELECT 
        u.id AS user_id,
        u.display_name,
        u.avatar_url,
        COALESCE(plb.total_points, 0) AS total_points,
        COALESCE(plb.correct_exact_scores, 0) AS correct_exact_scores,
        COALESCE(plb.correct_outcomes, 0) AS correct_outcomes
      FROM league_members lm
      JOIN users u ON lm.user_id = u.id
      LEFT JOIN predictor_leaderboard plb ON plb.league_id = lm.league_id AND plb.user_id = lm.user_id
      WHERE lm.league_id::text = $1
      ORDER BY 
        COALESCE(plb.total_points, 0) DESC,
        COALESCE(plb.correct_exact_scores, 0) DESC,
        COALESCE(plb.correct_outcomes, 0) DESC,
        u.display_name ASC
      `,
      [leagueId]
    );

    let currentRank = 1;
    const leaderboard: PredictorLeaderboardRow[] = res.rows.map((row, index) => {
      if (index > 0 && row.total_points < res.rows[index - 1].total_points) {
        currentRank = index + 1;
      }
      return {
        userId: row.user_id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        totalPoints: row.total_points,
        correctExactScores: row.correct_exact_scores,
        correctOutcomes: row.correct_outcomes,
        rank: currentRank,
      };
    });

    return {
      success: true,
      leaderboard,
      leagueName: leagueRes.rows[0].name,
    };
  } catch (error) {
    console.error('[getLeaguePredictorLeaderboard] Error:', error);
    return { success: false, leaderboard: [] };
  }
}

export interface ClaimedScore {
  home: number;
  away: number;
  claimedBy: string;
  isOwn: boolean;
}

/**
 * Server Action: Retrieve all claimed scorelines for a fixture in a league.
 * Used by PredictorPickModal to show taken scorelines and enforce exclusive claims.
 */
export async function getFixtureClaimedScores(
  leagueId: string,
  fixtureId: string,
  currentUserId?: string
): Promise<{
  success: boolean;
  claimedScores: ClaimedScore[];
  allowDuplicate: boolean;
  matchesPerGameweek?: number | 'ALL';
  isMatchClaimedByOther: boolean;
  claimedByOtherName?: string;
}> {
  try {
    if (!leagueId || leagueId.startsWith('demo-')) {
      return {
        success: true,
        claimedScores: [],
        allowDuplicate: false,
        matchesPerGameweek: 1,
        isMatchClaimedByOther: false,
      };
    }

    const leagueRes = await query(`SELECT settings FROM leagues WHERE id::text = $1`, [leagueId]);
    const settings = leagueRes.rows.length > 0
      ? (typeof leagueRes.rows[0].settings === 'string' ? JSON.parse(leagueRes.rows[0].settings) : leagueRes.rows[0].settings || {})
      : {};

    const allowDuplicate = settings.allow_duplicate_predictions === true;
    const matchesPerGameweek = settings.matches_per_gameweek ?? 1;

    const res = await query(
      `
      SELECT 
        pp.predicted_home_score AS home,
        pp.predicted_away_score AS away,
        pp.user_id,
        u.display_name
      FROM predictor_picks pp
      JOIN users u ON pp.user_id = u.id
      JOIN fixtures f ON pp.fixture_id = f.id
      WHERE pp.league_id::text = $1
        AND (pp.fixture_id::text = $2 OR f.external_id::text = $2)
        AND pp.market = 'EXACT_SCORE'
        AND pp.predicted_home_score IS NOT NULL
        AND pp.predicted_away_score IS NOT NULL;
      `,
      [leagueId, fixtureId]
    );

    let isMatchClaimedByOther = false;
    let claimedByOtherName: string | undefined;

    const claimedScores: ClaimedScore[] = res.rows.map((r) => {
      const isOwn = Boolean(currentUserId && r.user_id === currentUserId);
      if (!isOwn && !allowDuplicate) {
        isMatchClaimedByOther = true;
        claimedByOtherName = r.display_name;
      }
      return {
        home: r.home,
        away: r.away,
        claimedBy: r.display_name,
        isOwn,
      };
    });

    return {
      success: true,
      claimedScores,
      allowDuplicate,
      matchesPerGameweek,
      isMatchClaimedByOther,
      claimedByOtherName,
    };
  } catch (error) {
    console.error('[getFixtureClaimedScores] Error:', error);
    return {
      success: false,
      claimedScores: [],
      allowDuplicate: false,
      matchesPerGameweek: 1,
      isMatchClaimedByOther: false,
    };
  }
}

export interface PredictorMatchClaim {
  fixtureId: string;
  claimedBy: string;
  userId: string;
  isOwn: boolean;
  exactScore?: { home: number; away: number };
  outcome?: MatchOutcome;
  btts?: 'YES' | 'NO';
  overUnder?: 'OVER' | 'UNDER';
}

/**
 * Server Action: Retrieve all claimed Predictor matches for a gameweek in a league.
 * Used by WeeklyFixtures and FixtureCard to grey out and lock claimed matches.
 */
export async function getLeagueGameweekPredictorClaims(
  leagueId: string,
  gameweekNumber: number,
  currentUserId?: string
): Promise<{
  success: boolean;
  claims: Record<string, PredictorMatchClaim>;
  exclusiveMatches: boolean;
}> {
  try {
    if (!leagueId || leagueId.startsWith('demo-')) {
      return { success: true, claims: {}, exclusiveMatches: true };
    }

    const leagueRes = await query(`SELECT settings FROM leagues WHERE id::text = $1`, [leagueId]);
    const settings = leagueRes.rows.length > 0
      ? (typeof leagueRes.rows[0].settings === 'string' ? JSON.parse(leagueRes.rows[0].settings) : leagueRes.rows[0].settings || {})
      : {};

    const exclusiveMatches = settings.allow_duplicate_predictions !== true;

    const sql = `
      SELECT 
        f.id AS fixture_id,
        f.external_id AS fixture_external_id,
        u.id AS user_id,
        u.display_name,
        pp.market,
        pp.predicted_home_score,
        pp.predicted_away_score,
        pp.predicted_outcome
      FROM predictor_picks pp
      JOIN users u ON pp.user_id = u.id
      JOIN fixtures f ON pp.fixture_id = f.id
      JOIN gameweeks gw ON f.gameweek_id = gw.id
      WHERE pp.league_id::text = $1
        AND gw.gameweek_number = $2;
    `;

    const res = await query(sql, [leagueId, gameweekNumber]);
    const claims: Record<string, PredictorMatchClaim> = {};

    for (const row of res.rows) {
      const fixKey = row.fixture_id;
      if (!claims[fixKey]) {
        claims[fixKey] = {
          fixtureId: row.fixture_id,
          claimedBy: row.display_name,
          userId: row.user_id,
          isOwn: Boolean(currentUserId && row.user_id === currentUserId),
        };
      }
      if (row.market === 'EXACT_SCORE' && row.predicted_home_score !== null && row.predicted_away_score !== null) {
        claims[fixKey].exactScore = {
          home: row.predicted_home_score,
          away: row.predicted_away_score,
        };
      } else if (row.market === 'OUTCOME' && row.predicted_outcome) {
        claims[fixKey].outcome = row.predicted_outcome as MatchOutcome;
      } else if (row.market === 'BTTS' && row.predicted_outcome) {
        claims[fixKey].btts = row.predicted_outcome as 'YES' | 'NO';
      } else if (row.market === 'OVER_UNDER_2_5' && row.predicted_outcome) {
        claims[fixKey].overUnder = row.predicted_outcome as 'OVER' | 'UNDER';
      }

      if (row.fixture_external_id) {
        claims[String(row.fixture_external_id)] = claims[fixKey];
      }
    }

    return {
      success: true,
      claims,
      exclusiveMatches,
    };
  } catch (error) {
    console.error('[getLeagueGameweekPredictorClaims] Error:', error);
    return { success: false, claims: {}, exclusiveMatches: true };
  }
}

export interface RemovePredictorPickInput {
  leagueId: string;
  fixtureId: string;
  userId?: string;
}

export interface RemovePredictorPickResult {
  success: boolean;
  message: string;
  fixtureId: string;
}

/**
 * Server Action: Remove/cancel an existing Predictor prediction before match kickoff.
 * Releases the claimed fixture back to the league pool.
 */
export async function removePredictorPicks(
  input: RemovePredictorPickInput
): Promise<RemovePredictorPickResult> {
  const { leagueId, fixtureId } = input;
  try {
    let userId = input.userId;
    if (!userId) {
      const user = await getCurrentUser();
      userId = user?.id;
    }

    if (!userId || leagueId.startsWith('demo-')) {
      return {
        success: true,
        message: 'Prediction removed successfully! (Demo Mode)',
        fixtureId,
      };
    }

    return await withTransaction(async (client) => {
      // 1. Resolve fixture & verify deadline
      const fixRes = await client.query(
        `SELECT id, kickoff_time, status FROM fixtures WHERE id::text = $1 OR external_id::text = $1 LIMIT 1`,
        [fixtureId]
      );
      if (fixRes.rows.length === 0) {
        throw new Error('Fixture not found in database.');
      }
      const fixture = fixRes.rows[0];

      if (fixture.kickoff_time && new Date(fixture.kickoff_time).getTime() <= Date.now()) {
        throw new Error('Kickoff has already passed. Predictions are locked and cannot be removed.');
      }
      if (fixture.status === 'LIVE' || fixture.status === 'FINISHED') {
        throw new Error('Match is already in play or finished. Predictions cannot be removed.');
      }

      // 2. Delete predictions for this user & fixture in this league
      await client.query(
        `DELETE FROM predictor_picks WHERE league_id::text = $1 AND fixture_id = $2 AND user_id = $3`,
        [leagueId, fixture.id, userId]
      );

      return {
        success: true,
        message: 'Prediction removed successfully. The match is now open.',
        fixtureId: fixture.id,
      };
    });
  } catch (error: any) {
    console.error('[removePredictorPicks] Error removing prediction:', error);
    return {
      success: false,
      message: error?.message || 'Failed to remove prediction.',
      fixtureId,
    };
  }
}

