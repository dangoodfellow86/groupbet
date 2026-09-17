-- ====================================================================
-- 003_all_in_one_leagues.sql
-- Add ALL_IN_ONE to league_type enum to support dual LMS & Predictor
-- ====================================================================

ALTER TYPE league_type ADD VALUE IF NOT EXISTS 'ALL_IN_ONE';
