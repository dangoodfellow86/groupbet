# GroupBet — High-Level System Architecture

This document provides a comprehensive architectural breakdown of the **GroupBet** platform, illustrating component relationships, data flow, background scheduling, and the live matchday synchronization pipeline.

---

## 1. High-Level System Architecture Diagram

```mermaid
flowchart TB
    %% External Actors
    subgraph Clients["1. Client Layer (Multi-Platform)"]
        WebUser["Web & Mobile Browser<br/>(Desktop / Mobile)"]
        PWA["Mobile PWA / Future Native App<br/>(React Native / Expo)"]
        WhatsApp["WhatsApp / Social Apps<br/>(Invite Codes & Nudges)"]
    end

    %% Edge / Hosting
    subgraph Vercel["2. Application Layer (Next.js 16 on Vercel)"]
        direction TB
        subgraph Frontend["React 19 Frontend"]
            UI["UI Components<br/>(WeeklyFixtures, SurvivorBoard,<br/>PredictorLeaderboard, HistoryMatrix)"]
            TanStack["TanStack React Query v5<br/>(Cache & 60s Auto-polling)"]
            RTClient["Supabase Realtime Client<br/>(WebSocket Subscription)"]
        end

        subgraph ServerActions["Server Actions (src/server/actions)"]
            ActLMS["lms.ts<br/>(Picks & Exclusivity)"]
            ActPred["predictor.ts<br/>(Predictions & Multi-Market)"]
            ActLeague["leagues.ts<br/>(Invites & Memberships)"]
            ActAuth["auth.ts<br/>(Session & Guest Claims)"]
            ActComm["commissioner.ts<br/>(Roster & Round 2 Reset)"]
        end

        subgraph RouteHandlers["API Route Handlers (app/api)"]
            CronRoute["/api/cron/sync-fixtures<br/>(Token Protected)"]
            Webhooks["/api/webhooks/football<br/>(HMAC Signature Guard)"]
            FixturesAPI["/api/fixtures & /api/standings<br/>(Data Feed & ?refresh=true)"]
            AuthCallback["/api/auth/callback<br/>(OAuth Code Exchange)"]
        end

        subgraph CoreEngine["Core Engine & Services (src/core & src/server)"]
            SyncService["football-sync.ts<br/>(Bulk In-Memory Diff & Sync)"]
            ScoringEngine["scoring.ts<br/>(Pure Rule Engine)"]
            FootballAPIClient["football.ts<br/>(Football-Data.org Client)"]
            DBPool["pool.ts<br/>(pg.Pool -> Supabase Tx Pooler)"]
        end
    end

    %% Database Layer
    subgraph Supabase["3. Data & Persistence Layer (Supabase London eu-west-2)"]
        direction TB
        PgCron["pg_cron Scheduler<br/>(Runs every 10 mins)"]
        PgNet["pg_net Extension<br/>(Async HTTP GET)"]
        
        subgraph PostgresDB["PostgreSQL Database (Port 6543 Tx / 5432 Direct)"]
            Tables["Core Relational Tables:<br/>• fixtures & gameweeks<br/>• teams & competitions<br/>• leagues & league_members<br/>• lms_entries & lms_picks<br/>• predictor_picks & predictor_leaderboard<br/>• users"]
            StoredProcs["Stored Procedures:<br/>• settle_fixture(id, home, away)<br/>• void_fixture(id)"]
        end

        RealtimePub["Supabase Realtime (CDC)<br/>(Publication: supabase_realtime<br/>REPLICA IDENTITY FULL)"]
        AuthService["Supabase Auth<br/>(OAuth, Magic Links, JWTs)"]
    end

    %% External APIs
    subgraph ExternalServices["4. External Services"]
        FootballData["Football-Data.org REST API<br/>(Premier League Season 2026/27)"]
    end

    %% Client to Application Connections
    WebUser -->|HTTPS| UI
    PWA -->|HTTPS| UI
    WhatsApp -.->|Universal Invite Links| UI
    UI <--> TanStack
    TanStack --> ServerActions
    TanStack --> FixturesAPI

    %% Application Internal Wiring
    ServerActions --> DBPool
    RouteHandlers --> SyncService
    SyncService --> FootballAPIClient
    SyncService --> ScoringEngine
    SyncService --> DBPool
    FootballAPIClient -->|REST with API Key| FootballData

    %% Application to Database Connections
    DBPool -->|Transaction Pooling :6543| PostgresDB
    PgCron -->|Triggers */10 min| PgNet
    PgNet -->|HTTP GET ?secret=...| CronRoute
    RTClient <-->|WebSockets| RealtimePub
    RealtimePub -.->|Listens to WAL Changes| PostgresDB
    StoredProcs <--> Tables

    %% Authentication Flow
    UI <--> AuthService
    AuthService <--> AuthCallback
    AuthCallback --> ActAuth
```

---

## 2. Matchday Synchronization & Settlement Sequence

This diagram shows how live scores and automatic game settlements operate every 10 minutes:

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Supabase pg_cron
    participant PgNet as Supabase pg_net
    participant API as Next.js Sync Route (/api/cron)
    participant Sync as football-sync.ts
    participant Ext as Football-Data.org API
    participant DB as PostgreSQL (settle_fixture)
    participant RT as Supabase Realtime
    participant Client as User Browser (React 19)

    Note over Cron,PgNet: Scheduled every 10 minutes (*/10 * * * *)
    Cron->>PgNet: Execute net.http_get(groupbet-liard.vercel.app/api/cron/sync-fixtures?secret=...)
    PgNet->>API: HTTP GET with Bearer / Query Secret Token
    API->>Sync: syncFootballData()
    Sync->>Ext: GET /v4/competitions/PL/matches & standings
    Ext-->>Sync: Return 380 Fixtures + In-Play Scores
    
    Sync->>Sync: Diff external data vs in-memory cache (0 unnecessary DB queries)
    
    opt Fixture Status is LIVE (Score Changed)
        Sync->>DB: UPDATE fixtures SET home_score, away_score, status='LIVE'
        DB->>RT: WAL Change emitted
        RT-->>Client: WebSocket push: fixture update
        Client->>Client: Flash live score in WeeklyFixtures UI
    end

    opt Fixture Status is FINISHED (Match Concluded)
        Sync->>DB: SELECT settle_fixture(fixture_id, home_score, away_score)
        Note over DB: Stored procedure runs atomically:
        Note over DB: 1. Deduct lives from losing LMS picks
        Note over DB: 2. Check if sole survivor -> flag WINNER
        Note over DB: 3. Calculate Predictor points (Exact, Outcome, BTTS)
        Note over DB: 4. Rollup points into predictor_leaderboard
        DB->>RT: WAL Change emitted for lms_entries & predictor_leaderboard
        RT-->>Client: WebSocket push: live leaderboard & survivor board update
    end

    Sync-->>API: { success: true, processedMatches: 10, settledMatches: N }
    API-->>PgNet: HTTP 200 OK (Execution time ~1.5s)
```

---

## 3. Core Architectural Layers Explained

### Layer 1: Client & Presentation
- **Framework**: Next.js 16 App Router using React 19 Client and Server Components.
- **State & Caching**: `@tanstack/react-query` manages client-side data fetching with smart 60-second window polling on live matches.
- **Real-Time Push**: `@supabase/supabase-js` subscribes to database changes on `fixtures`, `lms_entries`, `lms_picks`, and `predictor_leaderboard`. When goals are scored or matches finish, the UI updates instantly without requiring a full page refresh.

### Layer 2: Next.js Server & Application Logic
- **Server Actions**:
  - [`lms.ts`](file:///c:/Dev/groupbet/src/server/actions/lms.ts): Enforces atomic row-level locks (`FOR UPDATE`), kickoff deadline cutoffs, no-repeat team constraints, and exclusivity within leagues.
  - [`predictor.ts`](file:///c:/Dev/groupbet/src/server/actions/predictor.ts): Handles multi-market predictions (Exact Score, Outcome, BTTS, Over/Under) and exclusive match claim locks.
  - [`leagues.ts`](file:///c:/Dev/groupbet/src/server/actions/leagues.ts): Manages collision-free 6-character invite codes (`GB-XXXXX`), duel participation for All-in-One leagues, and anti-cheat pick privacy masking (masking opponents' picks until kickoff).
  - [`auth.ts`](file:///c:/Dev/groupbet/src/server/actions/auth.ts): Handles guest sessions, Supabase OAuth token synchronization, and idempotent guest-to-account claiming.
- **Optimized Football Sync Service ([`football-sync.ts`](file:///c:/Dev/groupbet/src/server/services/football-sync.ts))**:
  - Bulk pre-fetches all 380 fixtures into memory.
  - Computes field diffs; unchanged fixtures trigger **0 database queries**.
  - Executes in under **1.9s** on Vercel Serverless.

### Layer 3: Database & Persistence (Supabase PostgreSQL)
- **Connection Strategy**:
  - Prioritizes Supabase **Transaction Pooler (Port 6543)** with `max: 5` and `idleTimeoutMillis: 1000` to prevent connection exhaustion (`EMAXCONNSESSION`).
  - Fallback to Direct URL (Port 5432) for schema migrations.
- **PostgreSQL Stored Procedures**:
  - `settle_fixture(fixture_id, home_score, away_score)`: Atomic transaction that settles both LMS survival/elimination logic and Predictor multi-market scoring, rolling up leaderboard points instantly.
  - `void_fixture(fixture_id)`: Safely voids matches postponed due to weather or cup fixtures without penalizing players.
- **In-Database Cron (`pg_cron` + `pg_net`)**:
  - Eliminates Vercel Hobby tier limitations by scheduling the recurring 10-minute HTTP ping directly from inside PostgreSQL.

### Layer 4: External Integrations
- **Football-Data.org**: Official live Premier League data feed (20 clubs, 380 fixtures, live standings).
- **Social Sharing**: Encoded WhatsApp and native clipboard deep-linking generators ([`sharing.ts`](file:///c:/Dev/groupbet/src/lib/sharing.ts)).
