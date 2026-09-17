# Groupbet — Football Predictor & Last Man Standing Platform

A modern, full-stack football gaming platform built for groups of friends to compete in **Last Man Standing** (survivor) and **Match Predictor** leagues. Powered by Next.js 16, Supabase PostgreSQL, and live Football-Data.org data.

---

## 🌟 Live Features & Current State

- **Matchday Hub**:
  - Live Premier League match feed with dynamic 60s auto-polling during live matches.
  - Gameweek navigation stepper (GW 1–38) with kickoff dates, scores, and status badges (`LIVE`, `FINISHED`, `SCHEDULED`).
  - Premier League Standings table with European qualification spots (UCL/UEL) and relegation zone accents.
- **Game Creation & Shareable Invites**:
  - Anyone can create a private game pool (**Last Man Standing** or **Match Predictor**).
  - Configurable settings: Starting Gameweek, Lives Count (1 or 2 lives), and host name.
  - Automatic collision-free 6-character invite code generation (e.g. `GB-BZXMQ`).
  - One-click **Copy Invite Link**, raw code copy, and **"Share to WhatsApp"** group prefilled button.
- **Frictionless Friend Join Flow**:
  - Dedicated landing page at `/join/[code]` displaying host name, league rules, and player count.
  - Instant join with player display name backed by session cookies and PostgreSQL `users` table.
- **Community Survivor Board**:
  - Real-time survivor grid showing all friends in the active league.
  - Live status tracking: Alive (💚), Knocked Out (💀), or Winner (👑).
  - Life counters and active gameweek team picks.
- **Last Man Standing Game Engine**:
  - Server Action enforcing atomic row-level locks, deadline enforcement, alive life checks, and no-repeat team constraints.
  - Modal with venue context (Home/Away), kickoff times, and optimistic UI updates.
- **Atomic Settlement Stored Procedures**:
  - `settle_fixture`: Automatically deducts lives on loss/draw, detects sole survivors, awards Predictor points (Exact score: +3, Outcome: +1, BTTS: +1), and rolls up leaderboards in PostgreSQL transactions.
  - `void_fixture`: Handles postponed/cancelled matches safely.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, React 19, TypeScript strict mode) |
| **Styling & UI** | Tailwind CSS v4, Lucide React, clsx, tailwind-merge |
| **State & Data** | TanStack Query v5 with automatic polling & cache invalidation |
| **Database** | Supabase PostgreSQL (London `eu-west-2`) via Session (5432) & Transaction (6543) Poolers |
| **ORM & Migrations** | Raw PostgreSQL migrations + Prisma Client v6.19.3 |
| **Football API** | Football-Data.org (Current 2026/2027 Live Premier League season) |

---

## 🚀 Quick Start Commands

```bash
# 1. Start development server (currently running on port 3000)
npm run dev

# 2. Run the complete automated test suite (all 6 suites)
npm run test

# 3. Individual test suites
npm run test:engine    # Pure scoring engine tests
npm run test:api       # Live Football-Data.org client test
npm run test:webhook   # Timing-safe HMAC signature tests
npm run test:lms       # LMS deadline & rule validation tests
npm run test:leagues   # Game creation, invite codes & join flow tests
npm run test:db        # Live Supabase settlement stored procedure test

# 4. Run database migrations
npm run db:migrate

# 5. Production build check
npm run build
```

---

## 🔐 Environment Variables (`.env`)

```ini
# Supabase PostgreSQL Connections
DATABASE_URL="postgresql://postgres.fzgasppurkboppuhqqqj:groupbet2026!@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.fzgasppurkboppuhqqqj:groupbet2026!@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"
DATABASE_SSL=true

# Football-Data.org API Key (Live Current Season)
FOOTBALL_DATA_API_KEY=566e86671d1f43469bc7c6bb9c0bd3ca

# Webhook & Cron Security Secrets
FOOTBALL_WEBHOOK_SECRET=groupbet_webhook_secret_key_2026
CRON_SECRET=groupbet_cron_secret_token_2026

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🌅 Morning Handover & Next Roadmap

When resuming development in the morning, the app is healthy, tests are 100% passing, and the dev server is active at `http://localhost:3000`.

### Suggested Morning Focus Areas:
1. **Predictor Pick UI Modal**:
   - Build the score prediction modal/drawer for inputting exact scores (e.g. `2-1`), outcome (1X2), and BTTS for upcoming Gameweek 5 fixtures.
2. **Survivor Board Pick Privacy**:
   - Mask opponent picks on the Survivor Board as "🔒 Pick Locked" until kickoff, then reveal their selection once the match starts.
3. **Supabase Auth (Optional)**:
   - Wire `@supabase/ssr` if you wish to add permanent email/password logins or OAuth beyond the current session cookie system.
4. **Automated Background Sync Cron**:
   - Connect Vercel Cron or GitHub Actions to `POST /api/cron/sync-fixtures` with `CRON_SECRET`.
