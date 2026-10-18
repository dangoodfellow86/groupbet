-- 008_enable_rls_policies.sql
-- Enable Row Level Security (RLS) across all public schema tables,
-- configure least-privilege policies for Supabase Data API & Realtime,
-- and harden administrative stored procedures.

-- ==========================================
-- 1. Enable RLS on All 12 Public Tables
-- ==========================================
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gameweeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictor_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictor_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- Note: public.schema_migrations intentionally has NO policies for anon or authenticated,
-- completely blocking client access via PostgREST while allowing server-side migrations via postgres.

-- ==========================================
-- 2. Public Football Reference Tables (Read-Only)
-- ==========================================
DROP POLICY IF EXISTS "Public read access for competitions" ON public.competitions;
CREATE POLICY "Public read access for competitions"
  ON public.competitions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read access for teams" ON public.teams;
CREATE POLICY "Public read access for teams"
  ON public.teams
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read access for gameweeks" ON public.gameweeks;
CREATE POLICY "Public read access for gameweeks"
  ON public.gameweeks
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read access for fixtures" ON public.fixtures;
CREATE POLICY "Public read access for fixtures"
  ON public.fixtures
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ==========================================
-- 3. Leagues & Realtime Game Tables (Read-Only for Client / Realtime)
-- All INSERT, UPDATE, and DELETE operations remain strictly blocked on the client
-- and are executed exclusively via Next.js Server Actions using the server DB pool.
-- ==========================================
DROP POLICY IF EXISTS "Public read access for leagues" ON public.leagues;
CREATE POLICY "Public read access for leagues"
  ON public.leagues
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read access for league_members" ON public.league_members;
CREATE POLICY "Public read access for league_members"
  ON public.league_members
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read access for lms_entries" ON public.lms_entries;
CREATE POLICY "Public read access for lms_entries"
  ON public.lms_entries
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read access for lms_picks" ON public.lms_picks;
CREATE POLICY "Public read access for lms_picks"
  ON public.lms_picks
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read access for predictor_picks" ON public.predictor_picks;
CREATE POLICY "Public read access for predictor_picks"
  ON public.predictor_picks
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read access for predictor_leaderboard" ON public.predictor_leaderboard;
CREATE POLICY "Public read access for predictor_leaderboard"
  ON public.predictor_leaderboard
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ==========================================
-- 4. Users Table (PII Protection: Owner-Only via Data API)
-- Uses (select auth.uid())::text initPlan caching pattern for performance
-- ==========================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_id = (select auth.uid())::text)
  WITH CHECK (auth_id = (select auth.uid())::text);

-- ==========================================
-- 5. Stored Procedure Hardening (Search Path & Privileges)
-- Prevent mutable search_path warnings and block direct client RPC execution
-- ==========================================
ALTER FUNCTION public.settle_fixture(UUID, INT, INT) SET search_path = public;
ALTER FUNCTION public.void_fixture(UUID) SET search_path = public;
ALTER FUNCTION public.set_fixture_live(UUID, INT, INT) SET search_path = public;
ALTER FUNCTION public.revert_fixture(UUID) SET search_path = public;
ALTER FUNCTION public.revert_gameweek(INT) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.settle_fixture(UUID, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.void_fixture(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_fixture_live(UUID, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_fixture(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_gameweek(INT) FROM PUBLIC, anon, authenticated;
