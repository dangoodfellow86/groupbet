# PROJECT CONTEXT: FOOTBALL PREDICTOR & LAST MAN STANDING (LMS)

## 1. Executive Summary & Vision
A full-stack football gaming platform built first as a Next.js web application, engineered to transition to React Native / Expo without rewriting core domain logic.

The platform provides:
- **Core Football Hub:** Fixtures, live scores, and league standings cached from an upstream football data API.
- **Last Man Standing (LMS):** Eliminator mini-leagues where players pick 1 team to win per gameweek. Draws or losses cost a life until 1 survivor wins.
- **Match Predictor:** Social leagues predicting exact scores, 1X2 outcomes, BTTS (Both Teams to Score), and Over/Under 2.5 goals.

---

## 2. Technical Stack & Shared Architecture

### Web Application (Phase 1)
- **Framework:** Next.js (App Router, React 19, TypeScript strict mode)
- **Styling:** Tailwind CSS + Lucide Icons + shadcn/ui patterns
- **Data Fetching & Cache:** TanStack Query (React Query)
- **Database:** PostgreSQL (Supabase / Neon) via connection pooling (PgBouncer)
- **ORM / Query Engine:** Kysely, Prisma, or `pg` raw SQL migrations with type safety
- **Scheduled Workers:** Next.js Route Handlers triggered via Vercel Cron or Inngest

### Codebase Organization (Designed for React Native Monorepo Extraction)
- `src/core/types/`: Pure TypeScript interfaces (Fixtures, Picks, Leagues, Rules).
- `src/core/api/`: Normalized sports data API clients and data mappers.
- `src/core/engine/`: Pure scoring algorithms, market settlement rules, and LMS validation.
- `src/server/db/`: Connection pool, schema migrations, and stored procedures.
- `src/server/actions/`: Server Actions for transactional user operations (e.g., submitting picks).
- `src/server/services/`: Background sync services and webhook handlers.
- `src/components/`: Modular React components (decoupled from direct server fetches).

---

## 3. Database Schema & Data Models

### Enums & Types
- `match_status`: `SCHEDULED`, `TIMED`, `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED`
- `league_type`: `LAST_MAN_STANDING`, `PREDICTOR`
- `entry_status`: `ALIVE`, `ELIMINATED`, `WINNER`
- `pick_result`: `PENDING`, `SURVIVED`, `LOST_LIFE`, `VOID`
- `market_type`: `EXACT_SCORE`, `OUTCOME`, `BTTS`, `OVER_UNDER_2_5`

### Tables
1. `competitions`: (`id`, `external_id`, `name`, `code`, `season`)
2. `teams`: (`id`, `external_id`, `name`, `short_name`, `tla`, `crest_url`)
3. `gameweeks`: (`id`, `competition_id`, `gameweek_number`, `deadline`, `is_current`, `is_completed`)
4. `fixtures`: (`id`, `external_id`, `gameweek_id`, `home_team_id`, `away_team_id`, `kickoff_time`, `status`, `home_score`, `away_score`, `settled_at`)
5. `users`: (`id`, `auth_id`, `display_name`, `email`, `avatar_url`)
6. `leagues`: (`id`, `competition_id`, `creator_id`, `name`, `type`, `invite_code`, `settings JSONB`)
7. `league_members`: (`id`, `league_id`, `user_id`, `role`, `joined_at`)
8. `lms_entries`: (`id`, `league_id`, `user_id`, `lives_remaining`, `status`, `eliminated_at_gameweek_id`)
9. `lms_picks`: (`id`, `entry_id`, `gameweek_id`, `team_id`, `result`)
10. `predictor_picks`: (`id`, `league_id`, `user_id`, `fixture_id`, `market`, `predicted_home_score`, `predicted_away_score`, `predicted_outcome`, `points_awarded`, `is_settled`)
11. `predictor_leaderboard`: (`league_id`, `user_id`, `total_points`, `correct_exact_scores`, `correct_outcomes`, `last_updated`)

---

## 4. Game Rules & Settlement Logic

### Last Man Standing (LMS)
- **Pick Constraints:** 1 pick per entry per gameweek.
- **Repeat Prohibition:** If `settings.allow_repeat_teams == false`, the player cannot pick a team previously chosen in that tournament.
- **Outcome Condition:** The chosen club must win outright. Draws or defeats decrement `lives_remaining` by 1.
- **Elimination:** Entries reaching 0 lives are marked `ELIMINATED`.
- **Winner Determination:** When exactly 1 active entry remains in a league, mark as `WINNER`.
- **Postponements:** Matches flagged `POSTPONED` or `CANCELLED` trigger pick status `VOID` (no life lost).

### Match Predictor
- **Deadline:** Match picks lock individually at `fixture.kickoff_time`.
- **Default Scoring:** Exact score (+3), Match outcome (+1), BTTS (+1), Over/Under 2.5 (+1).
- **Leaderboard Rollup:** Updated atomically upon match completion into `predictor_leaderboard`.

---

## 5. Settlement & Webhook Protocol

### Webhook Route: `POST /api/webhooks/football`
- Verify HMAC-SHA256 signature using `FOOTBALL_WEBHOOK_SECRET` against raw request text.
- Match external IDs to internal fixture UUIDs.
- Idempotency guard: If `status == 'FINISHED'` and `settled_at IS NOT NULL`, return `200 OK` immediately.
- Execute PostgreSQL stored procedures:
  - On `FINISHED`/`FT`: Call `settle_fixture(p_fixture_id, p_home_score, p_away_score)`.
  - On `POSTPONED`/`CANCELLED`: Call `void_fixture(p_fixture_id)`.
  - On In-Play events: Update current score and set status to `LIVE`.

---

## 6. Antigravity Agent Execution Directives

All autonomous agents operating in Antigravity must execute in sequence across the phases defined below. Before generating code in each phase, the agent must update `task.md` with explicit validation criteria.

---

### Step 1: Foundation, Types & Database Migrations
**Goal:** Configure the core project structure, connection pool, schema, and stored procedures.
1. Initialize the directory structure (`src/core/types`, `src/core/api`, `src/server/db`, `src/server/actions`).
2. Write raw SQL migration files:
   - Tables and enum definitions matching Section 3.
   - Stored procedures: `settle_fixture` and `void_fixture`.
   - Index definitions on `fixtures`, `lms_picks`, and `predictor_leaderboard`.
3. Export TypeScript interfaces in `src/core/types` that mirror database tables and JSON settings.

### Step 2: Football Data Service & Background Sync
**Goal:** Ingest Premier League fixtures, teams, gameweeks, and standings.
1. Implement `src/core/api/football.ts` integrating Football-Data.org (handling auth tokens, caching, and error states).
2. Implement `src/server/services/football-sync.ts` with upsert transactions that sync teams, gameweeks, and fixtures into PostgreSQL.
3. Expose protected cron handler at `app/api/cron/sync-fixtures/route.ts` requiring `CRON_SECRET`.
4. Expose internal API routes:
   - `GET /api/fixtures`: Returns matches with optional `?gw=` filter.
   - `GET /api/standings`: Returns current league table.

### Step 3: Webhook Ingestion & Match Settlement Engine
**Goal:** Enable automated, tamper-proof match settlement.
1. Create `src/lib/verify-webhook.ts` with timing-safe HMAC-SHA256 verification.
2. Build `app/api/webhooks/football/route.ts`:
   - Enforce raw body signature verification.
   - Map external payload match states to internal fixture statuses.
   - Call `settle_fixture` or `void_fixture` with transaction safety.

### Step 4: Frontend Hub & Real-Time Matchday View
**Goal:** Deliver a scannable, mobile-responsive dashboard.
1. Configure TanStack Query provider and root layout (`app/layout.tsx`).
2. Create hooks in `src/hooks/useFootballData.ts`:
   - `useGameweekFixtures(gw)` with 60-second auto-polling when live matches are detected.
   - `useStandings()` with 15-minute cache time.
3. Build UI components:
   - `src/components/FixtureCard.tsx`: Match status badges, kickoff formatting, team crests.
   - `src/components/WeeklyFixtures.tsx`: Gameweek stepper pagination, date grouping.
   - `src/components/LeagueTable.tsx`: Position highlights (UCL, UEL, Relegation).
4. Assemble dashboard in `app/page.tsx`.

### Step 5: LMS Game Engine & Pick Submission Workflow
**Goal:** Implement client-server pick submission with complete rule enforcement.
1. Create Server Action `src/server/actions/lms.ts` (`submitLmsPick`):
   - Row-level lock on entry.
   - Check remaining lives (> 0).
   - Enforce gameweek kickoff deadline.
   - Enforce no-repeat-team constraint against prior completed gameweeks.
   - Upsert pick record with `PENDING` status.
2. Build `src/components/LmsPickModal.tsx`:
   - Accessible dialog overlay with selected club overview and opponent context.
   - Warning banner if the club has already been selected.
   - Optimistic transitions and error feedback handling.
3. Wire selection callbacks from `FixtureCard` into `LmsPickModal`.

### Step 6: Verification & QA Directives
1. Run database tests: Execute mock fixture settlement and verify that:
   - Predictor points update correctly according to league settings.
   - LMS eliminated players lose a life.
   - A lone remaining player triggers `WINNER` status.
2. Run UI checks via Antigravity browser tools: Verify responsiveness at desktop (1280px) and mobile (375px) breakpoints.