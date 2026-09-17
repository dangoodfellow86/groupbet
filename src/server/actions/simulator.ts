'use server';

import { query, withTransaction } from '@/server/db/pool';

export interface SimulateFixtureInput {
  fixtureId: string;
  homeScore: number;
  awayScore: number;
}

export interface SimulatorResponse {
  success: boolean;
  message: string;
  fixtureId?: string;
}

/**
 * Server Action: Transition a fixture to LIVE (In-Play) with given live scores.
 * Opponent LMS picks will be revealed in real time, and match card will show LIVE pulse.
 */
export async function simulateFixtureLive(input: SimulateFixtureInput): Promise<SimulatorResponse> {
  try {
    const { fixtureId, homeScore, awayScore } = input;

    await withTransaction(async (client) => {
      // If fixture was previously finished, revert it first
      const fixCheck = await client.query(
        `SELECT id, status FROM fixtures WHERE id::text = $1 OR external_id::text = $1`,
        [fixtureId]
      );

      if (fixCheck.rows.length === 0) {
        throw new Error('Fixture not found');
      }

      const actualId = fixCheck.rows[0].id;
      if (fixCheck.rows[0].status === 'FINISHED') {
        await client.query(`SELECT revert_fixture($1)`, [actualId]);
      }

      await client.query(`SELECT set_fixture_live($1, $2, $3)`, [actualId, homeScore, awayScore]);
    });

    return {
      success: true,
      message: `Match is now LIVE (${homeScore} - ${awayScore})!`,
      fixtureId: input.fixtureId,
    };
  } catch (error: any) {
    console.error('[simulateFixtureLive] Error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to simulate live fixture.',
    };
  }
}

/**
 * Server Action: Settle a fixture at Full Time (FT), triggering LMS life deductions,
 * Predictor points distribution, and group leaderboard rollups.
 */
export async function simulateFixtureFinished(input: SimulateFixtureInput): Promise<SimulatorResponse> {
  try {
    const { fixtureId, homeScore, awayScore } = input;

    await withTransaction(async (client) => {
      const fixCheck = await client.query(
        `SELECT id, status FROM fixtures WHERE id::text = $1 OR external_id::text = $1`,
        [fixtureId]
      );

      if (fixCheck.rows.length === 0) {
        throw new Error('Fixture not found');
      }

      const actualId = fixCheck.rows[0].id;
      // If already finished, revert first to ensure clean idempotent settlement
      if (fixCheck.rows[0].status === 'FINISHED') {
        await client.query(`SELECT revert_fixture($1)`, [actualId]);
      }

      await client.query(`SELECT settle_fixture($1, $2, $3)`, [actualId, homeScore, awayScore]);
    });

    return {
      success: true,
      message: `Final whistle blown! Match settled FT (${homeScore} - ${awayScore}). Standings updated.`,
      fixtureId: input.fixtureId,
    };
  } catch (error: any) {
    console.error('[simulateFixtureFinished] Error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to settle match.',
    };
  }
}

/**
 * Server Action: Revert a fixture back to SCHEDULED state.
 * Restores pre-match scores, LMS lives, and Predictor points.
 */
export async function resetFixture(fixtureId: string): Promise<SimulatorResponse> {
  try {
    await withTransaction(async (client) => {
      const fixCheck = await client.query(
        `SELECT id FROM fixtures WHERE id::text = $1 OR external_id::text = $1`,
        [fixtureId]
      );

      if (fixCheck.rows.length === 0) {
        throw new Error('Fixture not found');
      }

      const actualId = fixCheck.rows[0].id;
      await client.query(`SELECT revert_fixture($1)`, [actualId]);
    });

    return {
      success: true,
      message: 'Match reset to SCHEDULED state. LMS lives and Predictor points restored.',
      fixtureId,
    };
  } catch (error: any) {
    console.error('[resetFixture] Error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to reset fixture.',
    };
  }
}

// Realistic Premier League score distribution pool for simulation
const REALISTIC_SCORES: [number, number][] = [
  [2, 1],
  [1, 0],
  [1, 1],
  [2, 0],
  [3, 1],
  [0, 2],
  [2, 2],
  [1, 2],
  [0, 1],
  [3, 2],
  [0, 0],
];

/**
 * Server Action: Simulate and settle all fixtures in a gameweek with realistic scores.
 */
export async function simulateEntireGameweek(gameweekNumber: number): Promise<SimulatorResponse> {
  try {
    const res = await withTransaction(async (client) => {
      const fixRes = await client.query(
        `
        SELECT f.id, f.status
        FROM fixtures f
        JOIN gameweeks gw ON f.gameweek_id = gw.id
        WHERE gw.gameweek_number = $1
        ORDER BY f.kickoff_time ASC
        `,
        [gameweekNumber]
      );

      if (fixRes.rows.length === 0) {
        throw new Error(`No fixtures found for Gameweek ${gameweekNumber}.`);
      }

      for (let i = 0; i < fixRes.rows.length; i++) {
        const fixture = fixRes.rows[i];
        if (fixture.status === 'FINISHED') {
          await client.query(`SELECT revert_fixture($1)`, [fixture.id]);
        }

        const [home, away] = REALISTIC_SCORES[i % REALISTIC_SCORES.length];
        await client.query(`SELECT settle_fixture($1, $2, $3)`, [fixture.id, home, away]);
      }

      return fixRes.rows.length;
    });

    return {
      success: true,
      message: `Successfully simulated and settled all ${res} matches in Gameweek ${gameweekNumber}!`,
    };
  } catch (error: any) {
    console.error('[simulateEntireGameweek] Error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to simulate gameweek.',
    };
  }
}

/**
 * Server Action: Revert all fixtures in a gameweek back to SCHEDULED.
 */
export async function resetEntireGameweek(gameweekNumber: number): Promise<SimulatorResponse> {
  try {
    await query(`SELECT revert_gameweek($1)`, [gameweekNumber]);
    return {
      success: true,
      message: `All matches in Gameweek ${gameweekNumber} have been reset to SCHEDULED.`,
    };
  } catch (error: any) {
    console.error('[resetEntireGameweek] Error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to reset gameweek.',
    };
  }
}
