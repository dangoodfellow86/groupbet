import assert from 'node:assert/strict';
import { query } from '../db/pool';

async function runTests() {
  console.log('🧪 Starting Supabase Realtime Publication & Database Replication Tests...\n');

  try {
    // ------------------------------------------------------------------------
    // 1. VERIFY SUPABASE_REALTIME PUBLICATION
    // ------------------------------------------------------------------------
    console.log('1. Checking pg_publication_tables for supabase_realtime...');
    const pubRes = await query(`
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
      ORDER BY tablename ASC;
    `);

    const registeredTables = pubRes.rows.map((r: any) => r.tablename);
    console.log('   Registered Realtime Tables:', registeredTables);

    const requiredTables = [
      'fixtures',
      'lms_entries',
      'lms_picks',
      'predictor_leaderboard',
      'predictor_picks',
    ];

    for (const table of requiredTables) {
      assert.ok(
        registeredTables.includes(table),
        `Table "${table}" must be present in supabase_realtime publication`
      );
    }
    console.log('   ✅ All 5 core matchday tables verified in supabase_realtime publication.');

    // ------------------------------------------------------------------------
    // 2. VERIFY REPLICA IDENTITY FULL
    // ------------------------------------------------------------------------
    console.log('\n2. Verifying REPLICA IDENTITY FULL for detailed change payloads...');
    const replRes = await query(`
      SELECT relname, relreplident 
      FROM pg_class 
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
      WHERE nspname = 'public' AND relname = ANY($1::text[])
      ORDER BY relname ASC;
    `, [requiredTables]);

    for (const row of replRes.rows) {
      assert.equal(
        row.relreplident,
        'f',
        `Table "${row.relname}" must have relreplident = 'f' (FULL)`
      );
    }
    console.log('   ✅ All tables verified with REPLICA IDENTITY FULL (sends old & new records).');

    // ------------------------------------------------------------------------
    // 3. TEST IN-PLAY STATUS & SCORE BROADCAST PAYLOAD READINESS
    // ------------------------------------------------------------------------
    console.log('\n3. Testing fixture live score update and revert...');
    const fixtureRes = await query(`
      SELECT id, home_score, away_score, status 
      FROM fixtures 
      WHERE status = 'SCHEDULED' 
      LIMIT 1;
    `);

    if (fixtureRes.rows.length > 0) {
      const fix = fixtureRes.rows[0];
      // Simulate live score
      await query(`
        UPDATE fixtures 
        SET status = 'LIVE', home_score = 1, away_score = 0 
        WHERE id = $1;
      `, [fix.id]);

      const liveCheck = await query(`
        SELECT status, home_score, away_score 
        FROM fixtures 
        WHERE id = $1;
      `, [fix.id]);

      assert.equal(liveCheck.rows[0].status, 'LIVE', 'Fixture should be LIVE');
      assert.equal(liveCheck.rows[0].home_score, 1, 'Home score should be 1');

      // Revert back
      await query(`
        UPDATE fixtures 
        SET status = $1, home_score = $2, away_score = $3 
        WHERE id = $4;
      `, [fix.status, fix.home_score, fix.away_score, fix.id]);

      console.log('   ✅ Fixture scoreline updated and cleanly reverted without data corruption.');
    } else {
      console.log('   ℹ️ No scheduled fixture found to test live score toggle (skipping update).');
    }

    console.log('\n🎉 ALL SUPABASE REALTIME CONFIGURATION TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Realtime test failed:', err);
    process.exit(1);
  }
}

runTests();
