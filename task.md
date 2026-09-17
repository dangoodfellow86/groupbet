# Groupbet Task & Phase Tracker

## Execution Checklist

- [x] **Step 1: Foundation, Types & Database Migrations**
  - [x] Initialize Next.js (App Router, React 19, TypeScript, Tailwind CSS)
  - [x] Establish directory structure (`src/core/types`, `src/core/api`, `src/core/engine`, `src/server/db`, `src/server/actions`, `src/server/services`, `src/components`, `src/hooks`, `src/lib`)
  - [x] Write raw SQL migrations matching Section 3 specifications:
    - [x] Enums: `match_status`, `league_type`, `entry_status`, `pick_result`, `market_type`
    - [x] Tables: `competitions`, `teams`, `gameweeks`, `fixtures`, `users`, `leagues`, `league_members`, `lms_entries`, `lms_picks`, `predictor_picks`, `predictor_leaderboard`
    - [x] Indexes on `fixtures`, `lms_picks`, `predictor_leaderboard`
    - [x] Stored procedures: `settle_fixture` and `void_fixture`
  - [x] Export pure TypeScript interfaces in `src/core/types/` mirroring the schema and JSON settings
  - [x] Setup database connection pooling (`src/server/db/pool.ts` / query helpers)
  - [x] *Validation Criteria*: Next.js builds cleanly with TypeScript strict mode; SQL schema and stored procedures syntactically verified; types exported and checked; scoring unit tests passing.

- [x] **Step 2: Football Data Service & Background Sync**
  - [x] Implement `src/core/api/football.ts` (Football-Data.org API client for live current season with TTL caching, error states, and token handling)
  - [x] Implement `src/server/services/football-sync.ts` (upsert transactions for teams, gameweeks, fixtures into Supabase)
  - [x] Build protected cron endpoint `app/api/cron/sync-fixtures/route.ts` with `CRON_SECRET`
  - [x] Expose internal endpoints: `GET /api/fixtures` and `GET /api/standings`
  - [x] *Validation Criteria*: Live Football-Data.org integration verified with user key (20 teams, current season GW 4/5 fixtures, Premier League standings); Route Handlers compiled successfully; test suite passed.

- [x] **Step 3: Webhook Ingestion & Match Settlement Engine**
  - [x] Create `src/lib/verify-webhook.ts` (timing-safe HMAC-SHA256 verification)
  - [x] Implement `app/api/webhooks/football/route.ts`:
    - [x] Raw request text HMAC check
    - [x] Idempotency guard on settled fixtures
    - [x] Trigger `settle_fixture` on finished or `void_fixture` on postponed/cancelled
  - [x] *Validation Criteria*: Webhook verification rejects invalid signatures, tampered payloads, and accepts valid HMAC; Route Handler compiled successfully.

- [x] **Step 4: Frontend Hub & Real-Time Matchday View**
  - [x] Configure TanStack Query provider and root layout (`app/layout.tsx`)
  - [x] Implement data hooks in `src/hooks/useFootballData.ts` (`useGameweekFixtures`, `useStandings`)
  - [x] Build components: `FixtureCard.tsx`, `WeeklyFixtures.tsx`, `LeagueTable.tsx`
  - [x] Assemble scannable dashboard in `app/page.tsx`
  - [x] *Validation Criteria*: Responsive UI across desktop and mobile, dynamic 60s auto-polling on live matches, position indicators for UCL/UEL/Relegation, clean Next.js build.

- [x] **Step 5: LMS Game Engine & Pick Submission Workflow**
  - [x] Implement Server Action `src/server/actions/lms.ts` (`submitLmsPick`):
    - [x] Row lock, alive check, gameweek deadline check, no-repeat team check
  - [x] Build `src/components/LmsPickModal.tsx` dialog and wire into `FixtureCard.tsx`
  - [x] *Validation Criteria*: Invalid picks rejected (deadlines, repeats, eliminated entries); valid picks upserted with PENDING; accessible modal with optimistic feedback; automated unit tests passing.

- [x] **Step 6: Verification & QA Directives**
  - [x] Run database tests on live Supabase instance:
    - [x] Predictor points update correctly according to rules (Exact score: +3, Outcome: +1, BTTS: +1 = 5 total)
    - [x] LMS eliminated player loses life and reaches 0 lives
    - [x] Sole remaining active player triggers `WINNER` status
    - [x] Atomic leaderboard roll-up into `predictor_leaderboard`
    - [x] Stored procedures `settle_fixture` and `void_fixture` verified
  - [x] Verified full test suite across 6 test suites (`test:engine`, `test:api`, `test:webhook`, `test:lms`, `test:leagues`, `test:db`) passing with 100% success.
  - [x] Production Next.js 16 App Router build verified (`npm run build`).

- [x] **Step 7: All-in-One Groups & Dual Participation**
  - [x] Migration 003: Added `'ALL_IN_ONE'` to `league_type` enum
  - [x] Unified group creation and joining: single invite code (`GB-XXXXX`) creates dual participation in `lms_entries` and `predictor_leaderboard`
  - [x] Dashboard banner displays dual stats (`💚 Lives Left` and `🏆 Pts`) for All-in-One groups
  - [x] Sidebar dynamically swaps between `SurvivorBoard` and `PredictorLeaderboard` based on active tab, with helpful routing prompts for single-mode leagues
  - [x] Anti-cheat pick privacy masking: opponents' picks are masked as `🔒 Pick Locked` until match kickoff, while users see their own picks unmasked

- [x] **Step 8: Live Match Simulator & Testing Sandbox**
  - [x] Migration 004: Created `set_fixture_live`, `revert_fixture`, and `revert_gameweek` stored procedures
  - [x] Implemented `src/server/actions/simulator.ts` for in-play simulation, FT settlements, match reverts, and full gameweek automation
  - [x] Built `src/components/SimulatorModal.tsx` testing console with score steppers, quick presets, in-play triggers, and real-time cache invalidation
  - [x] Added `⚡ Simulator` trigger button in top navigation bar of `src/app/page.tsx`
  - [x] Automated test suite `src/server/actions/simulator.test.ts` integrated into `npm run test`

- [x] **Step 9: Predictor Exclusive Scorelines & Gameweek Pick Limits**
  - [x] Schema & Settings: Configured `matches_per_gameweek` (Default: `1` vs `'ALL'`) and `allow_duplicate_predictions` (Default: `false` -> Exclusive)
  - [x] Server Action Enforcement (`src/server/actions/predictor.ts`):
    - [x] Exclusive scoreline rejection: prevents two players in the same league claiming identical exact scores on a fixture
    - [x] 1-Match gameweek limit: automatically switches and cleans up previous gameweek predictions
    - [x] Exported `getFixtureClaimedScores` API returning taken scorelines with ownership flags
  - [x] UI & User Experience (`src/components/PredictorPickModal.tsx`, `CreateGameModal.tsx`):
    - [x] Controls in game creation modal for choices per gameweek and claim rules
    - [x] Quick score chips indicating claimed scorelines with `🔒` padlock and strikethrough styling
    - [x] Alert banner indicating claimed scores and disabling the submit button
    - [x] List of claimed scorelines per match showing `Your Pick` vs other players

- [x] **Step 10: LMS Exclusive Team Selection & Live Pick Visibility**
  - [x] Schema & Settings: Configured `exclusive_team_picks` in `LmsLeagueSettings` and `leagues` table (Default: `true` for unique teams & live visibility; `false` for secret duplicate picks)
  - [x] Host Configuration (`src/components/CreateGameModal.tsx`):
    - [x] Added "LMS Team Selection Rule" dropdown (`Exclusive Picks (Unique Teams & Live Visibility)` [Default] vs `Secret Picks (Duplicates Allowed, Masked Until Kickoff)`)
  - [x] Server Action Enforcement (`src/server/actions/lms.ts`):
    - [x] Prevented duplicate team claims in the same gameweek within exclusive leagues
    - [x] Formatted user-friendly error: `"[Team] has already been picked by [Name] in this group. Under exclusive pick rules, each team can only be chosen once per gameweek."`
  - [x] Survivor Board & Claim Queries (`src/server/actions/leagues.ts`):
    - [x] Implemented `getLeagueGameweekLmsPicks` returning claim dictionary mapped by team UUID and external ID with ownership flags
    - [x] Updated `getLeagueSurvivorBoard` to reveal picks live (`isMasked = false`) when `exclusive_team_picks` is enabled
  - [x] Real-Time UI Greying & Locking (`FixtureCard.tsx`, `WeeklyFixtures.tsx`, `LmsPickModal.tsx`, `page.tsx`):
    - [x] Claimed teams on fixture cards greyed out (`opacity-40 cursor-not-allowed`) with `🔒 [Player Name]` badge
    - [x] LmsPickModal warning banner and disabled confirmation button `🔒 Team Taken ([Player Name])`
    - [x] Query caching and immediate invalidation on pick submission
- [x] **Step 11: Predictor Exclusive Match Claims & Live Locking**
  - [x] Backend Enforcement (`src/server/actions/predictor.ts`):
    - [x] `submitPredictorPicks` checks if any other active player in the league already has a pick on the match
    - [x] Rejection with friendly error: `"[Home] vs [Away] has already been chosen by [Name] in this group. Under exclusive match rules, each fixture can only be predicted by one player per gameweek."`
  - [x] Claims Query Action:
    - [x] Implemented `getLeagueGameweekPredictorClaims` returning all claimed fixtures mapped by fixture UUID & external ID with ownership flags
    - [x] Enhanced `getFixtureClaimedScores` with `isMatchClaimedByOther` and `claimedByOtherName`
  - [x] Frontend Greying & Locking (`FixtureCard.tsx`, `WeeklyFixtures.tsx`, `PredictorPickModal.tsx`, `page.tsx`):
    - [x] `FixtureCard` greys out claimed matches with `🔒 Claimed by [Player Name]` and disables selection
    - [x] `PredictorPickModal` displays top amber warning banner and disables confirmation button if match is taken
    - [x] `CreateGameModal` options updated to "Exclusive Matches" vs "Open Picks"
  - [x] *Validation Criteria*: All 8 test suites passing 100% (`npm run test`); `npm run build` compiling cleanly with Turbopack.

---

## Current Roadmap & Next Priorities

1. **Supabase Auth (Optional Multi-Device Sync)**:
   - Wire `@supabase/ssr` / Supabase Auth if permanent passwords or Google OAuth are desired on top of the current session cookie system.
2. **Automated Background Sync Cron**:
   - Connect Vercel Cron or GitHub Actions calling `POST /api/cron/sync-fixtures` with `CRON_SECRET` to automatically pull live match results every 1–5 minutes.
3. **Head-to-Head & Knockout Cup Mode**:
   - Optional tournament / cup knockout bracket generator across league members.

