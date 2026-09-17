-- ====================================================================
-- 006_round_two_commissioner.sql
-- Supports Commissioner Tools and Round 2 / Multi-Round Tournaments
-- ====================================================================

-- 1. Add current_round to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS current_round INT NOT NULL DEFAULT 1;

-- 2. Add round_number to lms_picks table
ALTER TABLE lms_picks ADD COLUMN IF NOT EXISTS round_number INT NOT NULL DEFAULT 1;

-- 3. Index on round_number
CREATE INDEX IF NOT EXISTS idx_lms_picks_round ON lms_picks(entry_id, round_number);
