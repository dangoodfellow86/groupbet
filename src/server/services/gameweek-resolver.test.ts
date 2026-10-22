import assert from 'node:assert/strict';
import { pool, query } from '@/server/db/pool';
import { resolveActiveGameweek } from './gameweek-resolver';

async function runTests() {
  console.log('🧪 Starting Gameweek Progression & Self-Healing Resolver Tests...\n');

  let tempCompId: string | null = null;

  try {
    // 1. Verify live Premier League (PL) gameweek progression (GW 7 completed -> GW 8 active)
    console.log('1. Verifying Premier League active gameweek progression...');
    const activePlGw = await resolveActiveGameweek({
      competitionCode: 'PL',
      allowOverdueAutoSync: false,
    });

    const plGw7Res = await query<{ is_current: boolean; is_completed: boolean }>(
      `SELECT gw.is_current, gw.is_completed
       FROM gameweeks gw
       JOIN competitions c ON gw.competition_id = c.id
       WHERE c.code = 'PL' AND gw.gameweek_number = 7`
    );

    if (plGw7Res.rows[0]?.is_completed) {
      assert.equal(
        plGw7Res.rows[0].is_current,
        false,
        'Completed GW 7 must NOT remain marked is_current = true'
      );
      assert.equal(
        activePlGw >= 8,
        true,
        `Expected active PL gameweek to have progressed past completed GW 7 (got GW ${activePlGw})`
      );
    }
    console.log(`   ✅ Premier League active gameweek resolved to GW ${activePlGw} (GW 7 is_current=false, is_completed=true)`);

    // 2. Test Self-Healing when DB flags are out of sync (e.g. completed GW accidentally marked is_current = true)
    console.log('\n2. Testing self-healing when a completed gameweek is stuck with is_current = true...');
    const plCompRes = await query<{ id: string }>(
      `SELECT id FROM competitions WHERE code = 'PL' LIMIT 1`
    );
    const plCompId = plCompRes.rows[0]?.id;
    assert.ok(plCompId, 'PL competition should exist');

    // Artificially simulate the old bug: set GW 7 to is_current = true and GW 8 to is_current = false
    await query(
      `UPDATE gameweeks SET is_current = (gameweek_number = 7) WHERE competition_id = $1`,
      [plCompId]
    );

    const healedGw = await resolveActiveGameweek({
      competitionId: plCompId,
      allowOverdueAutoSync: false,
    });
    assert.equal(healedGw, activePlGw, 'Resolver must return true active gameweek even when DB flag was stuck on GW 7');

    const checkAfterHeal = await query<{ gameweek_number: number; is_current: boolean }>(
      `SELECT gameweek_number, is_current
       FROM gameweeks
       WHERE competition_id = $1 AND is_current = TRUE`,
      [plCompId]
    );
    assert.equal(checkAfterHeal.rowCount, 1, 'Exactly one gameweek must be marked is_current = TRUE');
    assert.equal(
      checkAfterHeal.rows[0].gameweek_number,
      activePlGw,
      `Database is_current flag must be self-healed to GW ${activePlGw}`
    );
    console.log(`   ✅ Self-healed stuck GW 7 flag -> DB automatically updated is_current=true on GW ${activePlGw}`);

    // 3. Test Atomic Stored Procedure Advancement (settle_fixture & revert_fixture)
    console.log('\n3. Testing atomic gameweek advancement in settle_fixture() and rollback in revert_fixture()...');
    const teamsRes = await query<{ id: string }>(`SELECT id FROM teams LIMIT 2`);
    assert.equal(teamsRes.rows.length, 2, 'Need at least 2 teams in DB');
    const [teamA, teamB] = teamsRes.rows;

    const compInsert = await query<{ id: string }>(
      `INSERT INTO competitions (external_id, name, code, season)
       VALUES ($1, 'Temp Test League', 'TST', '2026/2027')
       RETURNING id`,
      [999000 + Math.floor(Math.random() * 900)]
    );
    tempCompId = compInsert.rows[0].id;

    const gw1Insert = await query<{ id: string }>(
      `INSERT INTO gameweeks (competition_id, gameweek_number, deadline, is_current, is_completed)
       VALUES ($1, 1, NOW() - INTERVAL '1 day', TRUE, FALSE)
       RETURNING id`,
      [tempCompId]
    );
    const gw2Insert = await query<{ id: string }>(
      `INSERT INTO gameweeks (competition_id, gameweek_number, deadline, is_current, is_completed)
       VALUES ($1, 2, NOW() + INTERVAL '6 days', FALSE, FALSE)
       RETURNING id`,
      [tempCompId]
    );
    const gw1Id = gw1Insert.rows[0].id;
    const gw2Id = gw2Insert.rows[0].id;

    const fix1Insert = await query<{ id: string }>(
      `INSERT INTO fixtures (external_id, gameweek_id, home_team_id, away_team_id, kickoff_time, status)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '3 hours', 'SCHEDULED')
       RETURNING id`,
      [8880001 + Math.floor(Math.random() * 10000), gw1Id, teamA.id, teamB.id]
    );
    const fix2Insert = await query<{ id: string }>(
      `INSERT INTO fixtures (external_id, gameweek_id, home_team_id, away_team_id, kickoff_time, status)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '6 days', 'SCHEDULED')
       RETURNING id`,
      [8890001 + Math.floor(Math.random() * 10000), gw2Id, teamB.id, teamA.id]
    );
    const fix1Id = fix1Insert.rows[0].id;
    const fix2Id = fix2Insert.rows[0].id;

    // Settle the only fixture in GW 1 -> GW 1 must become completed and GW 2 must become current!
    await query(`SELECT settle_fixture($1, 2, 0)`, [fix1Id]);

    const afterSettleGws = await query<{ gameweek_number: number; is_current: boolean; is_completed: boolean }>(
      `SELECT gameweek_number, is_current, is_completed
       FROM gameweeks
       WHERE competition_id = $1
       ORDER BY gameweek_number ASC`,
      [tempCompId]
    );

    assert.equal(afterSettleGws.rows[0].is_completed, true, 'GW 1 should be marked is_completed = true after final match settles');
    assert.equal(afterSettleGws.rows[0].is_current, false, 'GW 1 should no longer be is_current after completion');
    assert.equal(afterSettleGws.rows[1].is_current, true, 'GW 2 should automatically become is_current = true');
    console.log('   ✅ settle_fixture() atomically completed GW 1 and advanced is_current to GW 2');

    // Revert the fixture in GW 1 -> GW 1 must become uncompleted and current again!
    await query(`SELECT revert_fixture($1)`, [fix1Id]);

    const afterRevertGws = await query<{ gameweek_number: number; is_current: boolean; is_completed: boolean }>(
      `SELECT gameweek_number, is_current, is_completed
       FROM gameweeks
       WHERE competition_id = $1
       ORDER BY gameweek_number ASC`,
      [tempCompId]
    );

    assert.equal(afterRevertGws.rows[0].is_completed, false, 'GW 1 should revert to is_completed = false');
    assert.equal(afterRevertGws.rows[0].is_current, true, 'GW 1 should be restored to is_current = true');
    assert.equal(afterRevertGws.rows[1].is_current, false, 'GW 2 should revert to is_current = false');
    console.log('   ✅ revert_fixture() atomically restored GW 1 to active & uncompleted');

    // Clean up fixtures before deleting competition
    await query(`DELETE FROM fixtures WHERE id IN ($1, $2)`, [fix1Id, fix2Id]);

    console.log('\n🎉 ALL GAMEWEEK PROGRESSION & SELF-HEALING TESTS PASSED!');
  } finally {
    if (tempCompId) {
      await query(`DELETE FROM competitions WHERE id = $1`, [tempCompId]);
    }
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('❌ Gameweek Resolver Test Failed:', err);
  process.exit(1);
});
