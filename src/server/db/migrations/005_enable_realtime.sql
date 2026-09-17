-- ====================================================================
-- 005_enable_realtime.sql
-- Enable Supabase Realtime for fixtures, leaderboards, entries, and picks
-- ====================================================================

DO $$
BEGIN
  -- 1. Set REPLICA IDENTITY FULL for detailed change payloads (old and new records)
  ALTER TABLE fixtures REPLICA IDENTITY FULL;
  ALTER TABLE predictor_leaderboard REPLICA IDENTITY FULL;
  ALTER TABLE lms_entries REPLICA IDENTITY FULL;
  ALTER TABLE lms_picks REPLICA IDENTITY FULL;
  ALTER TABLE predictor_picks REPLICA IDENTITY FULL;

  -- 2. Ensure supabase_realtime publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- 3. Add tables to supabase_realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'fixtures'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE fixtures;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'predictor_leaderboard'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE predictor_leaderboard;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lms_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lms_entries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lms_picks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lms_picks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'predictor_picks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE predictor_picks;
  END IF;
END $$;
