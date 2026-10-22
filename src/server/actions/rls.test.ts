import assert from 'node:assert/strict';
import { pool } from '../db/pool';

const EXPECTED_PUBLIC_TABLES = [
  'competitions',
  'teams',
  'gameweeks',
  'fixtures',
  'users',
  'leagues',
  'league_members',
  'lms_entries',
  'lms_picks',
  'predictor_picks',
  'predictor_leaderboard',
  'schema_migrations',
  'user_feedback',
];

const ADMIN_FUNCTIONS = [
  'settle_fixture(uuid, integer, integer)',
  'void_fixture(uuid)',
  'set_fixture_live(uuid, integer, integer)',
  'revert_fixture(uuid)',
  'revert_gameweek(integer)',
  'sync_gameweek_completion(uuid)',
];

async function runTests() {
  console.log('--- Starting Row Level Security (RLS) & Database Hardening Tests ---');

  try {
    // 1. Verify EVERY table in the public schema has RLS enabled (rowsecurity = true)
    console.log('Test 1: Every table in public schema has RLS enabled...');
    const tablesRes = await pool.query<{ tablename: string; rowsecurity: boolean }>(
      `SELECT tablename, rowsecurity
       FROM pg_tables
       WHERE schemaname = 'public'
       ORDER BY tablename ASC`
    );

    const tableMap = new Map(tablesRes.rows.map((r) => [r.tablename, r.rowsecurity]));

    for (const expectedTable of EXPECTED_PUBLIC_TABLES) {
      assert.equal(
        tableMap.has(expectedTable),
        true,
        `Expected public.${expectedTable} to exist in pg_tables`
      );
      assert.equal(
        tableMap.get(expectedTable),
        true,
        `Expected public.${expectedTable} to have rowsecurity = true`
      );
    }

    // Also assert no unexpected public table exists with rowsecurity = false
    const unprotectedTables = tablesRes.rows.filter((r) => !r.rowsecurity).map((r) => r.tablename);
    assert.deepEqual(
      unprotectedTables,
      [],
      `Found public tables with RLS disabled: ${unprotectedTables.join(', ')}`
    );
    console.log(`✓ Passed (${tablesRes.rows.length} public tables verified with RLS enabled)`);

    // 2. Verify schema_migrations has zero policies (completely locked down from Data API)
    console.log('Test 2: schema_migrations has RLS enabled and zero client policies...');
    const migrationPoliciesRes = await pool.query(
      `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'schema_migrations'`
    );
    assert.equal(
      migrationPoliciesRes.rowCount,
      0,
      'schema_migrations must not expose any policies to anon or authenticated'
    );
    console.log('✓ Passed');

    // 3. Verify users table has owner-scoped SELECT and UPDATE policies and no anon policies
    console.log('Test 3: users table enforces authenticated owner-only SELECT and UPDATE policies...');
    const userPoliciesRes = await pool.query<{
      policyname: string;
      cmd: string;
      roles: string[];
      qual: string;
    }>(
      `SELECT policyname, cmd, roles, qual
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'users'`
    );

    assert.equal(userPoliciesRes.rows.length >= 2, true, 'Expected SELECT and UPDATE policies on users');
    for (const policy of userPoliciesRes.rows) {
      assert.equal(
        policy.roles.includes('anon'),
        false,
        `users policy "${policy.policyname}" must not be granted to anon`
      );
      assert.equal(
        policy.qual.includes('auth.uid()'),
        true,
        `users policy "${policy.policyname}" must scope to auth.uid()`
      );
    }
    console.log('✓ Passed');

    // 4. Verify Realtime & reference tables only allow SELECT via Data API (no client INSERT/UPDATE/DELETE policies)
    console.log('Test 4: Reference & Realtime tables only permit SELECT and block direct client writes...');
    const nonUserPoliciesRes = await pool.query<{
      tablename: string;
      policyname: string;
      cmd: string;
    }>(
      `SELECT tablename, policyname, cmd
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename != 'users'`
    );

    const readOnlyTables = EXPECTED_PUBLIC_TABLES.filter(
      (t) => t !== 'users' && t !== 'schema_migrations'
    );
    const coveredReadOnlyTables = new Set(nonUserPoliciesRes.rows.map((r) => r.tablename));

    for (const table of readOnlyTables) {
      assert.equal(
        coveredReadOnlyTables.has(table),
        true,
        `Expected SELECT policy on public.${table}`
      );
    }

    for (const policy of nonUserPoliciesRes.rows) {
      assert.equal(
        policy.cmd,
        'SELECT',
        `Expected only SELECT policy on public.${policy.tablename}, found ${policy.cmd} (${policy.policyname})`
      );
    }
    console.log('✓ Passed');

    // 5. Verify administrative stored procedures have immutable search_path and revoked anon/authenticated EXECUTE
    console.log('Test 5: Stored procedures have immutable search_path and revoked client EXECUTE...');
    for (const fnSig of ADMIN_FUNCTIONS) {
      const privRes = await pool.query<{
        anon_exec: boolean;
        auth_exec: boolean;
        proconfig: string[] | null;
      }>(
        `SELECT
           has_function_privilege('anon', $1, 'EXECUTE') AS anon_exec,
           has_function_privilege('authenticated', $1, 'EXECUTE') AS auth_exec,
           p.proconfig
         FROM pg_proc p
         WHERE p.oid = to_regprocedure($1)`,
        [`public.${fnSig}`]
      );

      assert.equal(privRes.rowCount, 1, `Expected function public.${fnSig} to exist`);
      const row = privRes.rows[0];
      assert.equal(
        row.anon_exec,
        false,
        `Expected anon NOT to have EXECUTE privilege on public.${fnSig}`
      );
      assert.equal(
        row.auth_exec,
        false,
        `Expected authenticated NOT to have EXECUTE privilege on public.${fnSig}`
      );
      assert.equal(
        Array.isArray(row.proconfig) && row.proconfig.some((c) => c.startsWith('search_path=')),
        true,
        `Expected public.${fnSig} to have an explicit search_path configured`
      );
    }

    // Ensure no other custom function in public lacks search_path
    const allPublicFns = await pool.query<{ proname: string; proconfig: string[] | null }>(
      `SELECT p.proname, p.proconfig
       FROM pg_proc p
       JOIN pg_namespace n ON p.pronamespace = n.oid
       WHERE n.nspname = 'public'
         AND NOT EXISTS (
           SELECT 1 FROM pg_depend d
           WHERE d.objid = p.oid AND d.deptype = 'e'
         )`
    );
    for (const fn of allPublicFns.rows) {
      assert.equal(
        Array.isArray(fn.proconfig) && fn.proconfig.some((c) => c.startsWith('search_path=')),
        true,
        `Expected public.${fn.proname} to have an explicit search_path configured`
      );
    }
    console.log(`✓ Passed (${allPublicFns.rows.length} public functions verified)`);

    console.log('--- All RLS & Database Hardening Tests Passed! ---');
  } finally {
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('RLS Test Failed:', err);
  process.exit(1);
});
